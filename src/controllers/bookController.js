const db = require('../db');

const bookController = {
    // Listar todos
    getAllBooks: async (req, res) => {
        try {
            // Query com GROUP_CONCAT para trazer autores e generos numa linha só
            const query = `
                SELECT 
                    l.idLivro, l.titulo, l.ano, l.editora, l.isbn, l.edicao,
                    e.quantidade AS estoque,
                    GROUP_CONCAT(DISTINCT a.nome SEPARATOR ', ') AS autores,
                    GROUP_CONCAT(DISTINCT g.nomeDoGenero SEPARATOR ', ') AS generos
                FROM livro l
                LEFT JOIN estoque e ON l.idLivro = e.idLivro
                LEFT JOIN livroautor la ON l.idLivro = la.idLivro
                LEFT JOIN autor a ON la.idAutor = a.idAutor
                LEFT JOIN livrogenero lg ON l.idLivro = lg.idLivro
                LEFT JOIN genero g ON lg.idGenero = g.idGenero
                GROUP BY l.idLivro
            `;
            const [rows] = await db.query(query);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getBookById: async (req, res) => {
        const { id } = req.params;
        try {
            // Mesma lógica, mas filtrando por ID
            const query = `
                SELECT 
                    l.*, 
                    e.quantidade AS estoque,
                    GROUP_CONCAT(DISTINCT a.nome SEPARATOR ', ') AS autores,
                    GROUP_CONCAT(DISTINCT g.nomeDoGenero SEPARATOR ', ') AS generos
                FROM livro l
                LEFT JOIN estoque e ON l.idLivro = e.idLivro
                LEFT JOIN livroautor la ON l.idLivro = la.idLivro
                LEFT JOIN autor a ON la.idAutor = a.idAutor
                LEFT JOIN livrogenero lg ON l.idLivro = lg.idLivro
                LEFT JOIN genero g ON lg.idGenero = g.idGenero
                WHERE l.idLivro = ?
                GROUP BY l.idLivro
            `;
            const [rows] = await db.query(query, [id]);
            if (rows.length === 0) return res.status(404).json({ message: "Livro não encontrado" });
            res.json(rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Criar livro

    createBook: async (req, res) => {
        const { titulo, ano, edicao, editora, isbn, estoqueInicial, autoresIds, generosIds } = req.body;

        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction();

            // Insere o Livro
            const [result] = await connection.query(
                `INSERT INTO livro (titulo, ano, edicao, editora, isbn) VALUES (?, ?, ?, ?, ?)`,
                [titulo, ano, edicao, editora, isbn]
            );
            const idLivro = result.insertId;

            // Cria o estoque inicial
            if (estoqueInicial !== undefined) {
                await connection.query(
                    `INSERT INTO estoque (idLivro, quantidade) VALUES (?, ?)`,
                    [idLivro, estoqueInicial]
                );
            }

            // Vincular autores
            if (autoresIds && Array.isArray(autoresIds)) {
                for (const idAutor of autoresIds) {
                    await connection.query(
                        `INSERT INTO livroautor (idLivro, idAutor) VALUES (?, ?)`,
                        [idLivro, idAutor]
                    );
                }
            }

            // Vincular gêneros
            if (generosIds && Array.isArray(generosIds)) {
                for (const idGenero of generosIds) {
                    await connection.query(
                        `INSERT INTO livrogenero (idLivro, idGenero) VALUES (?, ?)`,
                        [idLivro, idGenero]
                    );
                }
            }

            await connection.commit();
            res.status(201).json({ message: "Livro criado com sucesso!", id: idLivro });

        } catch (error) {
            await connection.rollback(); // Desfaz tudo caso gere erro
            console.error(error);
            res.status(500).json({ error: "Erro ao criar livro. Verifique os dados." });
        } finally {
            connection.release();
        }
    },

    // Atualização do livro

    updateBook: async (req, res) => {
        const { id } = req.params;
        const { titulo, ano, edicao, editora, isbn } = req.body;

        try {
            const query = `
                UPDATE livro 
                SET titulo = ?, ano = ?, edicao = ?, editora = ?, isbn = ?
                WHERE idLivro = ?
            `;
            await db.query(query, [titulo, ano, edicao, editora, isbn, id]);
            res.json({ message: "Dados do livro atualizados com sucesso" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Atualiza o estoque
    updateStock: async (req, res) => {
        const { id } = req.params;
        const { novaQuantidade } = req.body;

        try {
            const [check] = await db.query('SELECT * FROM estoque WHERE idLivro = ?', [id]);
            if (check.length > 0) {
                await db.query('UPDATE estoque SET quantidade = ? WHERE idLivro = ?', [novaQuantidade, id]);
            } else {
                await db.query('INSERT INTO estoque (idLivro, quantidade) VALUES (?, ?)', [id, novaQuantidade]);
            }
            res.json({ message: "Estoque atualizado" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Deletar livro

    deleteBook: async (req, res) => {
        const { id } = req.params;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Removendo dependências primeiro
            await connection.query('DELETE FROM estoque WHERE idLivro = ?', [id]);
            await connection.query('DELETE FROM livroautor WHERE idLivro = ?', [id]);
            await connection.query('DELETE FROM livrogenero WHERE idLivro = ?', [id]);
            
            // Removendo o livro
            const [result] = await connection.query('DELETE FROM livro WHERE idLivro = ?', [id]);

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ message: "Livro não encontrado" });
            }

            await connection.commit();
            res.json({ message: "Livro deletado com sucesso" });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: "Não é possível deletar este livro (pode haver empréstimos ativos)." });
        } finally {
            connection.release();
        }
    },

    getAllGenres: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM genero ORDER BY nomeDoGenero ASC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = bookController;