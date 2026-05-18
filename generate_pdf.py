from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=15)

# 1. Portada
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 20, "Universidad Gerardo Barrios", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 14)
pdf.cell(0, 10, "Facultad de Ciencia y Tecnología", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 10, "Asignatura: Programación Computacional IV", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 10, "Docente: Ing. William Alexis Montes Girón", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(10)
pdf.set_font("helvetica", "B", 18)
pdf.cell(0, 15, 'Proyecto: "Sistema Web de Control de Inventario y Ventas (InvenWeb)"', align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(20)

pdf.set_font("helvetica", "B", 14)
pdf.cell(0, 10, "Segundo Avance del Proyecto", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(20)

pdf.set_font("helvetica", "B", 12)
pdf.cell(0, 10, "Integrantes:", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
integrantes = [
    "Alberto Jose Velasquez Paz",
    "Ricardo Alberto Mendiola Hernández",
    "Luis Angel Zúniga Menjivar",
    "Victor Arnoldo Iglesias Sandoval",
    "Shelsy Rubi Melendez Rodríguez"
]
for p in integrantes:
    pdf.cell(0, 8, f"- {p}", align="L", new_x="LMARGIN", new_y="NEXT")

pdf.ln(30)
pdf.cell(0, 10, "Fecha: 10 de mayo de 2026", align="C", new_x="LMARGIN", new_y="NEXT")

# 3. Índice (Lo ponemos aquí por simplicidad, en fpdf generar un índice real con enlaces es más complejo)
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "Índice", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
indice_items = [
    ("1. Portada", 1),
    ("2. Introducción al Segundo Avance", 3),
    ("3. Requerimientos del Sistema y Prioridades", 4),
    ("4. Módulos Implementados (Segundo Avance)", 5),
    ("5. Módulos Faltantes por Implementar", 5)
]
for item in indice_items:
    pdf.cell(150, 10, item[0])
    pdf.cell(40, 10, str(item[1]), align="R", new_x="LMARGIN", new_y="NEXT")

# 2. Introducción
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "2. Introducción al Segundo Avance", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
intro_text = (
    "El presente documento detalla los elementos desarrollados correspondientes al Segundo Avance del "
    "proyecto 'Sistema Web de Control de Inventario y Ventas (InvenWeb)'. En esta fase, el enfoque ha estado "
    "en la construcción y conexión de las interfaces principales del sistema con su respectiva base de datos.\n\n"
    "Se hace entrega de un prototipo navegable (Single Page Application) que incorpora el diseño moderno "
    "y la estructura relacional definida en el primer avance. Entre los logros principales de este avance se "
    "encuentran la implementación del sistema de enrutamiento (frontend), el diseño de la base de datos "
    "utilizando SQLite (como reemplazo inicial ágil para el entorno de desarrollo), la creación de modelos y "
    "la codificación de los controladores backend usando PHP puro (simulando una arquitectura MVC ligera "
    "similar a Laravel). Adicionalmente, se logró conectar exitosamente la interfaz gráfica con el backend, "
    "permitiendo operaciones CRUD básicas en el módulo de Inventario y simulando el flujo de Punto de Venta (POS)."
)
pdf.multi_cell(0, 8, intro_text)

# 4. Requerimientos del Sistema
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "3. Requerimientos del Sistema y Prioridades", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
req_text = "El sistema se divide en los siguientes módulos, con sus respectivos requerimientos clasificados:"
pdf.multi_cell(0, 8, req_text)
pdf.ln(5)

# Módulo de Autenticación
pdf.set_font("helvetica", "B", 14)
pdf.cell(0, 10, "Módulo de Autenticación y Seguridad", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
pdf.cell(0, 8, "- Login de Usuarios (Prioridad: ALTA)", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "- Gestión de Roles y Permisos (Prioridad: MEDIA)", new_x="LMARGIN", new_y="NEXT")

pdf.ln(5)
# Módulo de Inventario
pdf.set_font("helvetica", "B", 14)
pdf.cell(0, 10, "Módulo de Inventario", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
pdf.cell(0, 8, "- CRUD de Categorías (Prioridad: ALTA)", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "- CRUD de Productos (Prioridad: ALTA)", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "- Alertas de Stock Mínimo (Prioridad: MEDIA)", new_x="LMARGIN", new_y="NEXT")

pdf.ln(5)
# Módulo de Ventas / POS
pdf.set_font("helvetica", "B", 14)
pdf.cell(0, 10, "Módulo de Ventas (Punto de Venta - POS)", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
pdf.cell(0, 8, "- Búsqueda de Productos por código/nombre (Prioridad: ALTA)", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "- Carrito de compras / Ticket en tiempo real (Prioridad: ALTA)", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "- Procesamiento de Venta y reducción de stock (Prioridad: ALTA)", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, "- Generación de Factura PDF (Prioridad: MEDIA)", new_x="LMARGIN", new_y="NEXT")

# 5. Módulos Implementados y Faltantes
pdf.add_page()
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "4. Módulos Implementados (Segundo Avance)", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
impl_text = (
    "Durante este segundo avance, se han implementado exitosamente las siguientes funcionalidades:\n\n"
    "1. Base de Datos Local: Creación automática de la estructura relacional (tablas: usuarios, categorias, "
    "productos, ventas, detalle_ventas) utilizando SQLite a través de un script inicializador en PHP.\n"
    "2. Módulo de Autenticación Básico: Interfaz de login navegable y validación de credenciales estáticas.\n"
    "3. Módulo de Inventario (Parcial): Interfaz que muestra listado de productos con datos traídos del "
    "backend. Creación de nuevos productos enviando datos desde la UI hacia la API PHP, los cuales son "
    "guardados en la base de datos.\n"
    "4. Módulo de Ventas (Parcial): Interfaz navegable del Punto de Venta (POS) con funcionalidad "
    "para buscar productos en tiempo real (en el frontend), agregarlos al ticket de compra, calcular "
    "subtotales/totales y procesar la venta haciendo que el backend reduzca automáticamente el inventario."
)
pdf.multi_cell(0, 8, impl_text)

pdf.ln(10)
pdf.set_font("helvetica", "B", 16)
pdf.cell(0, 15, "5. Módulos Faltantes por Implementar", align="L", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("helvetica", "", 12)
faltantes_text = (
    "Para los próximos avances y la versión final del sistema, queda pendiente lo siguiente:\n\n"
    "- Implementación Completa del CRUD: Desarrollar interfaces y endpoints para Editar y Eliminar "
    "productos y categorías.\n"
    "- Reportes e Historial: Módulo administrativo para ver el historial de ventas por fecha y reportes "
    "gráficos de ingresos.\n"
    "- Impresión de Comprobantes: Generación automática de facturas en PDF una vez confirmada la compra.\n"
    "- Autenticación Segura (JWT o Sesiones mejoradas): Restringir verdaderamente el acceso de las rutas "
    "de la API dependiendo del rol (Administrador vs Cajero).\n"
    "- Refactorización a Framework: Migrar opcionalmente la estructura actual a un framework robusto "
    "como Laravel (PHP) con base de datos MySQL, como se estipulaba en los documentos originales, una "
    "vez el entorno del servidor esté preparado."
)
pdf.multi_cell(0, 8, faltantes_text)

pdf.output("Segundo_Avance_InvenWeb.pdf")
