const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
const session = require('express-session');


// Middleware
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Conexión a la base de datos
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234', 
    database: 'eduplayia', 
    port: 3306
});

// Conectar a la base de datos
connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conectado como ID ' + connection.threadId);
});

app.get('/preguntas', (req, res) => {
    const { nivel_inicial, nivel_final } = req.query;
  
    if (!nivel_inicial || !nivel_final) {
      return res.status(400).json({ error: 'Faltan parámetros nivel_inicial o nivel_final' });
    }
  
    const query = 'SELECT * FROM preguntas WHERE id_nivel BETWEEN ? AND ?';
    connection.query(query, [parseInt(nivel_inicial), parseInt(nivel_final)], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Error al obtener las preguntas' });
      }
      res.json(results);
    });
  });


  // Configurar las sesiones
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Ruta de inicio de sesión
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM usuarios WHERE nombre = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            return res.status(500).send('Error en el servidor');
        }

        if (results.length > 0) {
            req.session.user = results[0];  // Guardar usuario en sesión
            return res.json({ message: 'Inicio de sesión exitoso', user: results[0] });
        } else {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }
    });
});

app.get('/user-puntaje', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No estás logueado' });
    }

    const userId = req.session.user.id_usuario;
    db.query('SELECT puntuacion_total FROM usuarios WHERE id_usuario = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).send('Error en el servidor');
        }
        res.json({ puntuacion: results[0].puntuacion_total });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.json({ message: 'Sesión cerrada' });
    });
});

// Registro de usuario
app.post('/registro', (req, res) => {
    const { nombre, contrasena } = req.body;
    bcrypt.hash(contrasena, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Error al registrar' });

        const sql = 'INSERT INTO usuarios (nombre, contrasena) VALUES (?, ?)';
        db.query(sql, [nombre, hash], (err, result) => {
            if (err) return res.status(500).json({ error: 'Error al registrar el usuario' });
            res.status(200).json({ message: 'Usuario registrado correctamente' });
        });
    });
});

// Login de usuario
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE nombre = ?';
    db.query(sql, [username], (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });

        const user = results[0];
        bcrypt.compare(password, user.contrasena, (err, isMatch) => {
            if (!isMatch) return res.status(400).json({ error: 'Contraseña incorrecta' });
            res.status(200).json({
                nombre: user.nombre,
                puntaje: user.puntaje
            });
        });
    });
});

// Logout de usuario (esta función depende de si implementas sesiones o tokens)
app.post('/logout', (req, res) => {
    // Aquí podrías destruir la sesión o el token del usuario
    res.status(200).json({ message: 'Sesión cerrada' });
});

app.listen(3002, () => {
    console.log('Servidor en puerto 3002');
});



// Endpoint para validar el inicio de sesión de un usuario (sin cifrado de contraseña)
app.post('/login', (req, res) => {
    const { nombre, contrasena } = req.body;

    if (!nombre || !contrasena) {
        return res.status(400).json({ error: 'Por favor ingresa nombre de usuario y contraseña' });
    }

    const checkUserQuery = 'SELECT * FROM usuarios WHERE nombre = ?';
    connection.query(checkUserQuery, [nombre], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al verificar el usuario' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'El nombre de usuario no existe' });
        }

        const usuario = results[0];

        // Compara la contraseña ingresada con la almacenada (sin cifrado)
        if (contrasena === usuario.contrasena) {
            // Crear un token JWT (cambia 'secreta' por una clave segura)
            const token = jwt.sign({ id: usuario.id_usuario, nombre: usuario.nombre }, 'secreta', { expiresIn: '1h' });

            return res.status(200).json({ message: 'Inicio de sesión exitoso', token: token });
        } else {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }
    });
});

// Endpoint para actualizar el puntaje del usuario
app.post('/actualizar_puntaje', (req, res) => {
    const { nombre, puntuaje } = req.body; // Obtenemos el nombre y el puntaje

    if (!nombre || !puntuaje) {
        return res.status(400).json({ error: 'Por favor ingresa el nombre de usuario y el puntaje' });
    }

    // Actualiza el puntaje del usuario en la base de datos
    const query = 'UPDATE usuarios SET puntuaje = ? WHERE nombre = ?';
    connection.query(query, [puntuaje, nombre], (err, results) => {
        if (err) {
            console.error('Error al actualizar el puntaje:', err);
            return res.status(500).json({ error: 'Error al actualizar el puntaje' });
        }

        // Verifica si se actualizó el puntaje
        if (results.affectedRows === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Puntaje actualizado exitosamente' });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});
