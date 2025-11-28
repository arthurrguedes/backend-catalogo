const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bookRoutes = require('./routes/bookRoutes');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Rotas
app.use('/books', bookRoutes);

app.get('/', (req, res) => {
    res.send('API de Catálogo e Estoque rodando!');
});

app.listen(PORT, () => {
    console.log(`Servidor de Catálogo rodando na porta ${PORT}`);
});