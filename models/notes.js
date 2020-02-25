module.exports = function (sequelize, DataTypes) {
    const Note = sequelize.define('Note', {
        noteId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'note_id'
        },
        noteContent: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'note_content'
        },
        noteBookId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            field: 'note_book_id'
        },
        noteBookPage: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'note_book_page'
        },
        noteStatus: {
            type: DataTypes.ENUM('normal', 'trash'),
            allowNull: false,
            defaultValue: 'normal',
            field: 'note_status'
        },
        noteCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'note_created'
        }
    }, {
        tableName: 'notes',
        createdAt: 'note_created',
        updatedAt: false,
        deletedAt: false
    });
    Note.associate = function (models) {
        Note.belongsTo(models.Book, {
            foreignKey: 'noteBookId',
            targetKey: 'bookId'
        });
    };

    return Note;
};
