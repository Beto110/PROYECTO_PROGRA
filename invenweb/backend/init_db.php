<?php
$db_file = __DIR__ . '/database.sqlite';

try {
    $pdo = new PDO("sqlite:" . $db_file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            rol VARCHAR(20) NOT NULL CHECK(rol IN ('Admin', 'Cajero'))
        );

        CREATE TABLE IF NOT EXISTS categorias (
            id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre VARCHAR(50) NOT NULL,
            descripcion TEXT
        );

        CREATE TABLE IF NOT EXISTS productos (
            id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
            id_categoria INTEGER,
            codigo_barras VARCHAR(50) UNIQUE,
            nombre VARCHAR(150) NOT NULL,
            precio DECIMAL(10,2) NOT NULL CHECK(precio > 0),
            stock INTEGER NOT NULL CHECK(stock >= 0),
            FOREIGN KEY(id_categoria) REFERENCES categorias(id_categoria)
        );

        CREATE TABLE IF NOT EXISTS ventas (
            id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER,
            fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
            total DECIMAL(10,2) NOT NULL,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id_usuario)
        );

        CREATE TABLE IF NOT EXISTS detalle_ventas (
            id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
            id_venta INTEGER,
            id_producto INTEGER,
            cantidad INTEGER NOT NULL CHECK(cantidad > 0),
            precio_unitario DECIMAL(10,2) NOT NULL,
            FOREIGN KEY(id_venta) REFERENCES ventas(id_venta),
            FOREIGN KEY(id_producto) REFERENCES productos(id_producto)
        );
    ");

    // Insert admin user
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $password = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->exec("INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Administrador', 'admin@invenweb.com', '$password', 'Admin')");
        $pdo->exec("INSERT INTO categorias (nombre, descripcion) VALUES ('Herramientas', 'Herramientas manuales y eléctricas')");
        $pdo->exec("INSERT INTO productos (id_categoria, codigo_barras, nombre, precio, stock) VALUES (1, '7701234567890', 'Martillo Truper', 15.50, 100)");
    }

    echo "Base de datos inicializada correctamente.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
