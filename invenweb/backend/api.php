<?php
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db_file = __DIR__ . '/database.sqlite';
$pdo = new PDO("sqlite:" . $db_file);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id_usuario'];
            $_SESSION['rol'] = $user['rol'];
            echo json_encode(['success' => true, 'user' => ['id' => $user['id_usuario'], 'nombre' => $user['nombre'], 'rol' => $user['rol']]]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Credenciales inválidas']);
        }
        break;

    case 'get_productos':
        $stmt = $pdo->query("SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'add_producto':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO productos (id_categoria, codigo_barras, nombre, precio, stock) VALUES (?, ?, ?, ?, ?)");
        try {
            $stmt->execute([$data['id_categoria'], $data['codigo_barras'], $data['nombre'], $data['precio'], $data['stock']]);
            echo json_encode(['success' => true, 'message' => 'Producto agregado']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'edit_producto':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE productos SET id_categoria=?, codigo_barras=?, nombre=?, precio=?, stock=? WHERE id_producto=?");
        try {
            $stmt->execute([$data['id_categoria'], $data['codigo_barras'], $data['nombre'], $data['precio'], $data['stock'], $data['id_producto']]);
            echo json_encode(['success' => true, 'message' => 'Producto actualizado']);
        } catch(Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'get_categorias':
        $stmt = $pdo->query("SELECT * FROM categorias");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'process_venta':
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? 1; // Default to 1 if not provided for prototyping
        $items = $data['items'] ?? [];
        $total = $data['total'] ?? 0;

        try {
            $pdo->beginTransaction();
            
            // Insert venta
            $stmt = $pdo->prepare("INSERT INTO ventas (id_usuario, total) VALUES (?, ?)");
            $stmt->execute([$userId, $total]);
            $ventaId = $pdo->lastInsertId();

            // Insert detalle and update stock
            $stmtDetalle = $pdo->prepare("INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
            $stmtStock = $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id_producto = ?");

            foreach ($items as $item) {
                $stmtDetalle->execute([$ventaId, $item['id_producto'], $item['cantidad'], $item['precio']]);
                $stmtStock->execute([$item['cantidad'], $item['id_producto']]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Venta procesada con éxito']);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
        break;
}
?>
