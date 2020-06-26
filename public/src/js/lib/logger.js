/**
 * friendly console
 * @author fuyun
 * @version 3.3.5
 * @since 2020-06-26
 */
module.exports = {
    log: (...args) => console ? console.log(...args) : null,
    info: (...args) => console ? console.info(...args) : null
};
