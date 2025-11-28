const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// Listar 
router.get('/', bookController.getAllBooks);
router.get('/genres', bookController.getAllGenres);
router.get('/:id', bookController.getBookById);

// Criar
router.post('/', bookController.createBook);

// Atualizar
router.put('/:id', bookController.updateBook);          // Dados do Livro
router.put('/:id/stock', bookController.updateStock);   // Apenas Estoque

// Deletar
router.delete('/:id', bookController.deleteBook);

module.exports = router;