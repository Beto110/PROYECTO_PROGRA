<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db_file = __DIR__ . '/database.sqlite';
$pdo = new PDO("sqlite:" . $db_file);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("PRAGMA foreign_keys = ON");

// Migration: ensure imagen column exists
$cols = $pdo->query("PRAGMA table_info(productos)")->fetchAll(PDO::FETCH_ASSOC);
$colNames = array_column($cols, 'name');
if (!in_array('imagen', $colNames)) {
    $pdo->exec("ALTER TABLE productos ADD COLUMN imagen VARCHAR(255) DEFAULT NULL");
}

// Ensure log_acciones table exists
$pdo->exec("CREATE TABLE IF NOT EXISTS log_acciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER,
    accion VARCHAR(50) NOT NULL,
    detalle TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_usuario) REFERENCES usuarios(id_usuario)
)");

// Ensure uploads directory exists
$uploadsDir = __DIR__ . '/uploads/productos';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

$action = $_GET['action'] ?? '';

// Helper: log an action
function logAction($pdo, $userId, $accion, $detalle) {
    try {
        $stmt = $pdo->prepare("INSERT INTO log_acciones (id_usuario, accion, detalle) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $accion, $detalle]);
    } catch(Exception $e) { /* silent */ }
}

// Helper: handle image upload
function handleImageUpload($fileInput) {
    global $uploadsDir;
    if (!isset($_FILES[$fileInput]) || $_FILES[$fileInput]['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    $file = $_FILES[$fileInput];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['error' => 'Error al subir el archivo.'];
    }
    // Validate size (2MB max)
    if ($file['size'] > 2 * 1024 * 1024) {
        return ['error' => 'La imagen no debe exceder 2MB.'];
    }
    // Validate type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mimeType, $allowedTypes)) {
        return ['error' => 'Solo se permiten imágenes JPEG, PNG o WebP.'];
    }
    // Generate unique name
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $newName = uniqid('prod_', true) . '.' . strtolower($ext);
    $destPath = $uploadsDir . '/' . $newName;
    if (move_uploaded_file($file['tmp_name'], $destPath)) {
        return ['path' => 'uploads/productos/' . $newName];
    }
    return ['error' => 'No se pudo guardar la imagen.'];
}

// Helper: delete image file
function deleteImageFile($imagePath) {
    if ($imagePath) {
        $fullPath = __DIR__ . '/' . $imagePath;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }
}

// Determine content type based on action
if (!in_array($action, ['export_productos'])) {
    header("Content-Type: application/json");
}

switch ($action) {

    // ===================== AUTH =====================
    case 'login':
        $data = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if ($email === '') $errors[] = 'El correo electrónico es requerido.';
        elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'El formato del correo no es válido.';
        if ($password === '') $errors[] = 'La contraseña es requerida.';

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id_usuario'];
            $_SESSION['rol'] = $user['rol'];
            logAction($pdo, $user['id_usuario'], 'LOGIN', 'Inicio de sesión');
            echo json_encode(['success' => true, 'user' => ['id' => $user['id_usuario'], 'nombre' => $user['nombre'], 'rol' => $user['rol']]]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Credenciales inválidas. Verifique su correo y contraseña.']);
        }
        break;

    // ===================== PRODUCTOS =====================
    case 'get_productos':
        $stmt = $pdo->query("SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria ORDER BY p.nombre ASC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'add_producto':
        // Accept both JSON and multipart/form-data
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'multipart/form-data') !== false) {
            $data = $_POST;
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
        }
        $errors = [];

        $codigo = trim($data['codigo_barras'] ?? '');
        $nombre = trim($data['nombre'] ?? '');
        $id_cat  = $data['id_categoria'] ?? '';
        $precio  = $data['precio'] ?? '';
        $stock   = $data['stock'] ?? '';

        if ($codigo === '') $errors[] = 'El código de barras es requerido.';
        if ($nombre === '') $errors[] = 'El nombre del producto es requerido.';
        elseif (strlen($nombre) < 3) $errors[] = 'El nombre debe tener al menos 3 caracteres.';
        if ($id_cat === '' || !is_numeric($id_cat)) $errors[] = 'Debe seleccionar una categoría válida.';
        if ($precio === '' || !is_numeric($precio) || floatval($precio) <= 0) $errors[] = 'El precio debe ser un número mayor a 0.';
        if ($stock === '' || !is_numeric($stock) || intval($stock) < 0) $errors[] = 'El stock debe ser un número entero mayor o igual a 0.';

        // Check duplicate barcode
        if ($codigo !== '') {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM productos WHERE codigo_barras = ?");
            $chk->execute([$codigo]);
            if ($chk->fetchColumn() > 0) $errors[] = 'Ya existe un producto con ese código de barras.';
        }

        // Handle image upload
        $imagePath = null;
        if (isset($_FILES['imagen'])) {
            $imgResult = handleImageUpload('imagen');
            if ($imgResult && isset($imgResult['error'])) {
                $errors[] = $imgResult['error'];
            } elseif ($imgResult && isset($imgResult['path'])) {
                $imagePath = $imgResult['path'];
            }
        }

        if (!empty($errors)) {
            if ($imagePath) deleteImageFile($imagePath);
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO productos (id_categoria, codigo_barras, nombre, precio, stock, imagen) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([intval($id_cat), $codigo, $nombre, floatval($precio), intval($stock), $imagePath]);
            logAction($pdo, $_SESSION['user_id'] ?? 1, 'CREAR_PRODUCTO', "Producto: $nombre ($codigo)");
            echo json_encode(['success' => true, 'message' => 'Producto agregado exitosamente.']);
        } catch(Exception $e) {
            if ($imagePath) deleteImageFile($imagePath);
            echo json_encode(['success' => false, 'message' => 'Error al guardar: ' . $e->getMessage()]);
        }
        break;

    case 'edit_producto':
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'multipart/form-data') !== false) {
            $data = $_POST;
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
        }
        $errors = [];

        $id      = $data['id_producto'] ?? '';
        $codigo  = trim($data['codigo_barras'] ?? '');
        $nombre  = trim($data['nombre'] ?? '');
        $id_cat  = $data['id_categoria'] ?? '';
        $precio  = $data['precio'] ?? '';
        $stock   = $data['stock'] ?? '';
        $removeImage = ($data['remove_imagen'] ?? '') === '1';

        if ($id === '' || !is_numeric($id)) $errors[] = 'ID de producto inválido.';
        if ($codigo === '') $errors[] = 'El código de barras es requerido.';
        if ($nombre === '') $errors[] = 'El nombre del producto es requerido.';
        elseif (strlen($nombre) < 3) $errors[] = 'El nombre debe tener al menos 3 caracteres.';
        if ($id_cat === '' || !is_numeric($id_cat)) $errors[] = 'Debe seleccionar una categoría válida.';
        if ($precio === '' || !is_numeric($precio) || floatval($precio) <= 0) $errors[] = 'El precio debe ser un número mayor a 0.';
        if ($stock === '' || !is_numeric($stock) || intval($stock) < 0) $errors[] = 'El stock debe ser un número entero mayor o igual a 0.';

        // Check duplicate barcode (exclude self)
        if ($codigo !== '' && $id !== '') {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM productos WHERE codigo_barras = ? AND id_producto != ?");
            $chk->execute([$codigo, intval($id)]);
            if ($chk->fetchColumn() > 0) $errors[] = 'Ya existe otro producto con ese código de barras.';
        }

        // Handle image
        $newImagePath = null;
        if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] !== UPLOAD_ERR_NO_FILE) {
            $imgResult = handleImageUpload('imagen');
            if ($imgResult && isset($imgResult['error'])) {
                $errors[] = $imgResult['error'];
            } elseif ($imgResult && isset($imgResult['path'])) {
                $newImagePath = $imgResult['path'];
            }
        }

        if (!empty($errors)) {
            if ($newImagePath) deleteImageFile($newImagePath);
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            // Get current image path
            $currentStmt = $pdo->prepare("SELECT imagen FROM productos WHERE id_producto = ?");
            $currentStmt->execute([intval($id)]);
            $currentImage = $currentStmt->fetchColumn();

            $imagePath = $currentImage; // keep current by default
            if ($newImagePath) {
                // New image uploaded, delete old
                deleteImageFile($currentImage);
                $imagePath = $newImagePath;
            } elseif ($removeImage) {
                // User wants to remove image
                deleteImageFile($currentImage);
                $imagePath = null;
            }

            $stmt = $pdo->prepare("UPDATE productos SET id_categoria=?, codigo_barras=?, nombre=?, precio=?, stock=?, imagen=? WHERE id_producto=?");
            $stmt->execute([intval($id_cat), $codigo, $nombre, floatval($precio), intval($stock), $imagePath, intval($id)]);
            logAction($pdo, $_SESSION['user_id'] ?? 1, 'EDITAR_PRODUCTO', "Producto ID: $id - $nombre");
            echo json_encode(['success' => true, 'message' => 'Producto actualizado exitosamente.']);
        } catch(Exception $e) {
            if ($newImagePath) deleteImageFile($newImagePath);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $e->getMessage()]);
        }
        break;

    case 'delete_producto':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id_producto'] ?? '';

        if ($id === '' || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID de producto inválido.']);
            break;
        }

        // Check if product has associated sales
        $chk = $pdo->prepare("SELECT COUNT(*) FROM detalle_ventas WHERE id_producto = ?");
        $chk->execute([intval($id)]);
        if ($chk->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'No se puede eliminar: este producto tiene ventas asociadas.']);
            break;
        }

        try {
            // Get image path before deleting
            $imgStmt = $pdo->prepare("SELECT imagen, nombre FROM productos WHERE id_producto = ?");
            $imgStmt->execute([intval($id)]);
            $prod = $imgStmt->fetch(PDO::FETCH_ASSOC);
            
            $stmt = $pdo->prepare("DELETE FROM productos WHERE id_producto = ?");
            $stmt->execute([intval($id)]);
            
            // Delete image file
            if ($prod && $prod['imagen']) {
                deleteImageFile($prod['imagen']);
            }
            
            logAction($pdo, $_SESSION['user_id'] ?? 1, 'ELIMINAR_PRODUCTO', "Producto ID: $id - " . ($prod['nombre'] ?? 'Desconocido'));
            echo json_encode(['success' => true, 'message' => 'Producto eliminado exitosamente.']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()]);
        }
        break;

    // ===================== CATEGORIAS =====================
    case 'get_categorias':
        $stmt = $pdo->query("SELECT c.*, (SELECT COUNT(*) FROM productos WHERE id_categoria = c.id_categoria) as total_productos FROM categorias c ORDER BY c.nombre ASC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'add_categoria':
        $data = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        $nombre = trim($data['nombre'] ?? '');
        $descripcion = trim($data['descripcion'] ?? '');

        if ($nombre === '') $errors[] = 'El nombre de la categoría es requerido.';
        elseif (strlen($nombre) < 2) $errors[] = 'El nombre debe tener al menos 2 caracteres.';

        // Check duplicate name
        if ($nombre !== '') {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM categorias WHERE LOWER(nombre) = LOWER(?)");
            $chk->execute([$nombre]);
            if ($chk->fetchColumn() > 0) $errors[] = 'Ya existe una categoría con ese nombre.';
        }

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)");
            $stmt->execute([$nombre, $descripcion]);
            logAction($pdo, $_SESSION['user_id'] ?? 1, 'CREAR_CATEGORIA', "Categoría: $nombre");
            echo json_encode(['success' => true, 'message' => 'Categoría creada exitosamente.']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error al guardar: ' . $e->getMessage()]);
        }
        break;

    case 'edit_categoria':
        $data = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        $id = $data['id_categoria'] ?? '';
        $nombre = trim($data['nombre'] ?? '');
        $descripcion = trim($data['descripcion'] ?? '');

        if ($id === '' || !is_numeric($id)) $errors[] = 'ID de categoría inválido.';
        if ($nombre === '') $errors[] = 'El nombre de la categoría es requerido.';
        elseif (strlen($nombre) < 2) $errors[] = 'El nombre debe tener al menos 2 caracteres.';

        // Check duplicate name (exclude self)
        if ($nombre !== '' && $id !== '') {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id_categoria != ?");
            $chk->execute([$nombre, intval($id)]);
            if ($chk->fetchColumn() > 0) $errors[] = 'Ya existe otra categoría con ese nombre.';
        }

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            $stmt = $pdo->prepare("UPDATE categorias SET nombre=?, descripcion=? WHERE id_categoria=?");
            $stmt->execute([$nombre, $descripcion, intval($id)]);
            logAction($pdo, $_SESSION['user_id'] ?? 1, 'EDITAR_CATEGORIA', "Categoría ID: $id - $nombre");
            echo json_encode(['success' => true, 'message' => 'Categoría actualizada exitosamente.']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $e->getMessage()]);
        }
        break;

    case 'delete_categoria':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id_categoria'] ?? '';

        if ($id === '' || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID de categoría inválido.']);
            break;
        }

        // Check if category has associated products
        $chk = $pdo->prepare("SELECT COUNT(*) FROM productos WHERE id_categoria = ?");
        $chk->execute([intval($id)]);
        if ($chk->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'No se puede eliminar: esta categoría tiene productos asociados. Elimine o reasigne los productos primero.']);
            break;
        }

        try {
            $nameStmt = $pdo->prepare("SELECT nombre FROM categorias WHERE id_categoria = ?");
            $nameStmt->execute([intval($id)]);
            $catName = $nameStmt->fetchColumn();

            $stmt = $pdo->prepare("DELETE FROM categorias WHERE id_categoria = ?");
            $stmt->execute([intval($id)]);
            logAction($pdo, $_SESSION['user_id'] ?? 1, 'ELIMINAR_CATEGORIA', "Categoría ID: $id - $catName");
            echo json_encode(['success' => true, 'message' => 'Categoría eliminada exitosamente.']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()]);
        }
        break;

    // ===================== VENTAS =====================
    case 'get_ventas':
        $stmt = $pdo->query("
            SELECT v.id_venta, v.fecha_hora, v.total, u.nombre as cajero
            FROM ventas v
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            ORDER BY v.fecha_hora DESC
        ");
        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get details for each sale
        $stmtDet = $pdo->prepare("
            SELECT dv.cantidad, dv.precio_unitario, p.nombre as producto_nombre
            FROM detalle_ventas dv
            LEFT JOIN productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = ?
        ");

        foreach ($ventas as &$venta) {
            $stmtDet->execute([$venta['id_venta']]);
            $venta['detalles'] = $stmtDet->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'data' => $ventas]);
        break;

    case 'process_venta':
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? 1;
        $items = $data['items'] ?? [];
        $total = $data['total'] ?? 0;
        $errors = [];

        if (empty($items)) $errors[] = 'El carrito está vacío.';
        if (!is_numeric($total) || floatval($total) <= 0) $errors[] = 'El total de la venta no es válido.';

        // Validate each item
        foreach ($items as $item) {
            if (!isset($item['id_producto']) || !is_numeric($item['id_producto'])) {
                $errors[] = 'Producto inválido en el carrito.';
                break;
            }
            if (!isset($item['cantidad']) || intval($item['cantidad']) <= 0) {
                $errors[] = 'Cantidad inválida en el carrito.';
                break;
            }
            // Check stock
            $chk = $pdo->prepare("SELECT stock, nombre FROM productos WHERE id_producto = ?");
            $chk->execute([intval($item['id_producto'])]);
            $prod = $chk->fetch(PDO::FETCH_ASSOC);
            if (!$prod) {
                $errors[] = 'Producto no encontrado.';
                break;
            }
            if (intval($item['cantidad']) > intval($prod['stock'])) {
                $errors[] = "Stock insuficiente para '{$prod['nombre']}'. Disponible: {$prod['stock']}.";
                break;
            }
        }

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO ventas (id_usuario, total) VALUES (?, ?)");
            $stmt->execute([$userId, floatval($total)]);
            $ventaId = $pdo->lastInsertId();

            $stmtDetalle = $pdo->prepare("INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
            $stmtStock = $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id_producto = ?");

            $detallesLog = [];
            foreach ($items as $item) {
                $stmtDetalle->execute([$ventaId, intval($item['id_producto']), intval($item['cantidad']), floatval($item['precio'])]);
                $stmtStock->execute([intval($item['cantidad']), intval($item['id_producto'])]);
                $detallesLog[] = $item['nombre'] . ' x' . $item['cantidad'];
            }

            $pdo->commit();
            logAction($pdo, $userId, 'PROCESAR_VENTA', "Venta #$ventaId - Total: $$total - Items: " . implode(', ', $detallesLog));
            echo json_encode(['success' => true, 'message' => 'Venta procesada con éxito.', 'id_venta' => $ventaId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error al procesar la venta: ' . $e->getMessage()]);
        }
        break;

    // ===================== DASHBOARD STATS =====================
    case 'get_dashboard_stats':
        $stats = [];

        // Sales today
        $stmt = $pdo->query("SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM ventas WHERE DATE(fecha_hora) = DATE('now', 'localtime')");
        $today = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['ventas_hoy'] = ['total' => floatval($today['total']), 'count' => intval($today['count'])];

        // Sales this week
        $stmt = $pdo->query("SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM ventas WHERE fecha_hora >= DATE('now', '-7 days', 'localtime')");
        $week = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['ventas_semana'] = ['total' => floatval($week['total']), 'count' => intval($week['count'])];

        // Sales this month
        $stmt = $pdo->query("SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM ventas WHERE strftime('%Y-%m', fecha_hora) = strftime('%Y-%m', 'now', 'localtime')");
        $month = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['ventas_mes'] = ['total' => floatval($month['total']), 'count' => intval($month['count'])];

        // Inventory value
        $stmt = $pdo->query("SELECT COALESCE(SUM(precio * stock), 0) as valor FROM productos");
        $stats['valor_inventario'] = floatval($stmt->fetchColumn());

        // Total products and out of stock
        $stmt = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as agotados, SUM(CASE WHEN stock > 0 AND stock < 10 THEN 1 ELSE 0 END) as bajo FROM productos");
        $prodStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['productos_total'] = intval($prodStats['total']);
        $stats['productos_agotados'] = intval($prodStats['agotados']);
        $stats['productos_stock_bajo'] = intval($prodStats['bajo']);

        // Sales last 7 days (for line chart)
        $ventas7dias = [];
        for ($i = 6; $i >= 0; $i--) {
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(total), 0) as total FROM ventas WHERE DATE(fecha_hora) = DATE('now', ? || ' days', 'localtime')");
            $stmt->execute(["-$i"]);
            $dayTotal = $stmt->fetchColumn();
            
            $dateStmt = $pdo->prepare("SELECT DATE('now', ? || ' days', 'localtime')");
            $dateStmt->execute(["-$i"]);
            $dateStr = $dateStmt->fetchColumn();
            
            $ventas7dias[] = ['fecha' => $dateStr, 'total' => floatval($dayTotal)];
        }
        $stats['ventas_7_dias'] = $ventas7dias;

        // Top 5 most sold products (for bar chart)
        $stmt = $pdo->query("
            SELECT p.nombre, SUM(dv.cantidad) as total_vendido
            FROM detalle_ventas dv
            JOIN productos p ON dv.id_producto = p.id_producto
            GROUP BY dv.id_producto
            ORDER BY total_vendido DESC
            LIMIT 5
        ");
        $stats['top_productos'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Products per category (for donut chart)
        $stmt = $pdo->query("
            SELECT c.nombre, COUNT(p.id_producto) as total
            FROM categorias c
            LEFT JOIN productos p ON p.id_categoria = c.id_categoria
            GROUP BY c.id_categoria
            ORDER BY total DESC
        ");
        $stats['productos_por_categoria'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $stats]);
        break;

    // ===================== EXPORT CSV =====================
    case 'export_productos':
        header("Content-Type: text/csv; charset=utf-8");
        header("Content-Disposition: attachment; filename=inventario_" . date('Y-m-d') . ".csv");

        $output = fopen('php://output', 'w');
        // BOM for Excel UTF-8
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        fputcsv($output, ['Código', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Valor Total']);

        $stmt = $pdo->query("SELECT p.codigo_barras, p.nombre, c.nombre as categoria, p.precio, p.stock FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria ORDER BY p.nombre");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($output, [
                $row['codigo_barras'],
                $row['nombre'],
                $row['categoria'] ?? 'Sin categoría',
                number_format($row['precio'], 2),
                $row['stock'],
                number_format($row['precio'] * $row['stock'], 2)
            ]);
        }

        fclose($output);
        logAction($pdo, $_SESSION['user_id'] ?? 1, 'EXPORTAR_CSV', 'Exportación de inventario a CSV');
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
        break;
}
?>
