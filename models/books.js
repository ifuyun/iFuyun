module.exports = function (sequelize, DataTypes) {
    const Book = sequelize.define('Book', {
        bookId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'book_id'
        },
        bookName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'book_name'
        },
        bookAuthor: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'book_author'
        },
        bookTranslator: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'book_translator'
        },
        bookPress: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'book_press'
        },
        bookEdition: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'book_edition'
        },
        bookIsbn: {
            type: DataTypes.STRING(127),
            allowNull: false,
            field: 'book_isbn'
        },
        bookPrice: {
            type: DataTypes.DECIMAL,
            allowNull: false,
            field: 'book_price'
        },
        bookQuantity: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            allowNull: false,
            field: 'book_quantity'
        },
        bookType: {
            type: DataTypes.ENUM('book', 'newspaper', 'magazine', 'periodical', 'other'),
            allowNull: false,
            defaultValue: 'book',
            field: 'book_type'
        },
        bookMediaType: {
            type: DataTypes.ENUM('paper', 'kindle', 'wechat', 'other'),
            allowNull: false,
            defaultValue: 'paper',
            field: 'book_media_type'
        },
        bookPurchaseTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'book_purchase_time'
        },
        bookPurchaseChannel: {
            type: DataTypes.ENUM('amazon', 'jd', 'tmall', 'dangdang', 'offline', 'other'),
            allowNull: false,
            field: 'book_purchase_channel'
        },
        bookStatus: {
            type: DataTypes.ENUM('normal', 'trash', 'loaned'),
            allowNull: false,
            defaultValue: 'normal',
            field: 'book_status'
        },
        bookCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'book_created'
        }
    }, {
        tableName: 'books',
        createdAt: 'book_created',
        updatedAt: false,
        deletedAt: false
    });
    Book.associate = function (models) {
        Book.hasMany(models.Comment, {
            foreignKey: 'noteBookId',
            sourceKey: 'bookId'
        });
    };

    return Book;
};
