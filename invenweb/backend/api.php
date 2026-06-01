<?php
session_start();
header("Content-Type: application/json");
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

$action = $_GET['action'] ?? '';

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
        $data = json_decode(file_get_contents('php://input'), true);
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

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO productos (id_categoria, codigo_barras, nombre, precio, stock) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([intval($id_cat), $codigo, $nombre, floatval($precio), intval($stock)]);
            echo json_encode(['success' => true, 'message' => 'Producto agregado exitosamente.']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error al guardar: ' . $e->getMessage()]);
        }
        break;

    case 'edit_producto':
        $data = json_decode(file_get_contents('php://input'), true);
        $errors = [];

        $id      = $data['id_producto'] ?? '';
        $codigo  = trim($data['codigo_barras'] ?? '');
        $nombre  = trim($data['nombre'] ?? '');
        $id_cat  = $data['id_categoria'] ?? '';
        $precio  = $data['precio'] ?? '';
        $stock   = $data['stock'] ?? '';

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

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors), 'errors' => $errors]);
            break;
        }

        try {
            $stmt = $pdo->prepare("UPDATE productos SET id_categoria=?, codigo_barras=?, nombre=?, precio=?, stock=? WHERE id_producto=?");
            $stmt->execute([intval($id_cat), $codigo, $nombre, floatval($precio), intval($stock), intval($id)]);
            echo json_encode(['success' => true, 'message' => 'Producto actualizado exitosamente.']);
        } catch(Exception $e) {
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
            $stmt = $pdo->prepare("DELETE FROM productos WHERE id_producto = ?");
            $stmt->execute([intval($id)]);
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
            $stmt = $pdo->prepare("DELETE FROM categorias WHERE id_categoria = ?");
            $stmt->execute([intval($id)]);
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

            foreach ($items as $item) {
                $stmtDetalle->execute([$ventaId, intval($item['id_producto']), intval($item['cantidad']), floatval($item['precio'])]);
                $stmtStock->execute([intval($item['cantidad']), intval($item['id_producto'])]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Venta procesada con éxito.', 'id_venta' => $ventaId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error al procesar la venta: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
        break;
}
?>
