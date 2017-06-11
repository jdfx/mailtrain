'use strict';

let db = require('../db');
let tools = require('../tools');
let _ = require('../translate')._;
let tableHelpers = require('../table-helpers');
let config = require('config');
let mysql = require('mysql');

let allowedKeys = ['description', 'editor_name', 'editor_data', 'html', 'text'];

module.exports.list = (start, limit, callback) => {
    tableHelpers.list('templates', ['*'], 'name', null, start, limit, callback);
};

module.exports.filter = (request, parent, callback) => {
    tableHelpers.filter('templates', ['*'], request, ['#', 'name', 'description'], ['name'], 'name ASC', null, callback);
};

module.exports.quicklist = callback => {
    tableHelpers.quicklist('templates', ['id', 'name'], 'name', callback);
};

module.exports.get = (id, callback) => {
    id = Number(id) || 0;

    if (id < 1) {
        return callback(new Error(_('Missing Template ID')));
    }

    db.getConnection((err, connection) => {
        if (err) {
            return callback(err);
        }

        connection.query('SELECT * FROM templates WHERE id=?', [id], (err, rows) => {
            //connection.release();
            if (err) {
                return callback(err);
            }

            if (!rows || !rows.length) {
                return callback(null, false);
            }

            let tags = '';

            connection.query('SELECT * FROM tags WHERE template_id=?', [id], (err, tagRows) => {
                connection.release();
                if (err) {
                    return callback(err);
                }

                if (tagRows && tagRows.length > 0) {
                    tagRows.forEach(tagRow => {
                        tags += tagRow.name+',';
                    });
                }

                let template = tools.convertKeys(rows[0]);
                if(tags !== ''){
                    template.tags = tags;
                }

                return callback(null, template);

            });
        });

    });
};

module.exports.create = (template, callback) => {

    let data = tools.convertKeys(template);

    if (!(data.name || '').toString().trim()) {
        return callback(new Error(_('Template Name must be set')));
    }

    let name = (template.name || '').toString().trim();

    let keys = ['name'];
    let values = [name];
    let tags = [];

    Object.keys(template).forEach(key => {
        let value = template[key].trim();
        key = tools.toDbKey(key);
        if (key === 'description') {
            value = tools.purifyHTML(value);
        }
        if (allowedKeys.indexOf(key) >= 0) {
            keys.push(key);
            values.push(value);
        }
        if(key === 'tags'){
            tags = value.split(/\s*,\s*/);
        }
    });

    db.getConnection((err, connection) => {
        if (err) {
            return callback(err);
        }

        let query = 'INSERT INTO templates (' + keys.join(', ') + ') VALUES (' + values.map(() => '?').join(',') + ')';

        connection.query(query, values, (err, result) => {
            connection.release();
            if (err) {
                return callback(err);
            }

            let templateId = result && result.insertId || false;

            if(tags.length < 1){

                return callback(null, templateId);

            } else {

                let query = '';
                tags.forEach(tag => {
                    query += 'INSERT INTO tags (name, template_id) VALUES ("'+ tag + '","' + templateId + '");';
                });

                let mysqlConfig = {
                    multipleStatements: true
                };

                Object.keys(config.mysql).forEach(key => mysqlConfig[key] = config.mysql[key]);
                let dbMulti = mysql.createPool(mysqlConfig);

                dbMulti.getConnection((err, connection) => {
                    if (err) {
                        return callback(err);
                    }

                    connection.query(query, values, err => {
                        connection.release();
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, templateId);
                    });

                });
            }
        });

    });
};

module.exports.update = (id, updates, callback) => {
    updates = updates || {};
    id = Number(id) || 0;

    let data = tools.convertKeys(updates);

    if (id < 1) {
        return callback(new Error(_('Missing Template ID')));
    }

    if (!(data.name || '').toString().trim()) {
        return callback(new Error(_('Template Name must be set')));
    }

    let name = (updates.name || '').toString().trim();
    let keys = ['name'];
    let values = [name];
    let inputTags = [];

    Object.keys(updates).forEach(key => {
        let value = updates[key].trim();
        key = tools.toDbKey(key);
        if (key === 'description') {
            value = tools.purifyHTML(value);
        }
        if (allowedKeys.indexOf(key) >= 0) {
            keys.push(key);
            values.push(value);
        }
        if(key === 'tags'){
            inputTags = value.split(/\s*,\s*/);
        }
    });

    db.getConnection((err, connection) => {
        if (err) {
            return callback(err);
        }

        values.push(id);

        connection.query('UPDATE templates SET ' + keys.map(key => key + '=?').join(', ') + ' WHERE id=? LIMIT 1', values, (err, result) => {
            connection.release();
            if (err) {
                return callback(err);
            }

            if(inputTags.length < 1){

                return callback(null, result && result.affectedRows || false);

            } else {

                let query = '';
                inputTags.forEach(tag => {
                    query += 'SELECT * FROM tags WHERE name = "' + tag + '" AND template_id = ' + id + '; ';
                });

                let mysqlConfig = {
                    multipleStatements: true
                };

                Object.keys(config.mysql).forEach(key => mysqlConfig[key] = config.mysql[key]);
                let dbMulti = mysql.createPool(mysqlConfig);

                dbMulti.getConnection((err, connection) => {
                    if (err) {
                        return callback(err);
                    }

                    connection.query(query, [id], (err, tagRows) => {
                        connection.release();
                        if (err) {
                            return callback(err);
                        }

                        let dbTags = [];

                        if (tagRows && tagRows.length > 0) {
                            tagRows.forEach(tagRow => {
                                dbTags.push(tagRow);
                            });
                        }

                        let tagsToDelete = [];

                        for (let d = 0, len = dbTags.length; d < len; d++) {

                            let dbTag_found = false;

                            if(typeof dbTags[d][0] !== 'undefined'){

                                for (let i = 0, len = inputTags.length; i < len; i++) {

                                    if (dbTags[d][0].name === inputTags[i] && id === dbTags[d][0].template_id) {

                                        inputTags.splice(i, 1);

                                    }

                                }

                                if(!dbTag_found){

                                    tagsToDelete.push(dbTags[d][0]);

                                }

                            }

                        }

                        if(inputTags.length < 1){

                            return callback(null, result && result.affectedRows || false);

                        } else {

                            let query = '';
                            inputTags.forEach(tag => {

                                query += 'INSERT INTO tags (name, template_id) VALUES ("' + tag + '","' + id + '");';
                            });

                            let mysqlConfig = {
                                multipleStatements: true
                            };

                            Object.keys(config.mysql).forEach(key => mysqlConfig[key] = config.mysql[key]);
                            let dbMulti = mysql.createPool(mysqlConfig);

                            dbMulti.getConnection((err, connection) => {
                                if (err) {
                                    return callback(err);
                                }

                                connection.query(query, values, err => {
                                    connection.release();
                                    if (err) {
                                        return callback(err);
                                    }
                                    return callback(null, result && result.affectedRows || false);
                                });
                            });
                        }
                    });
                });
            }
        });
    });
};

module.exports.delete = (id, callback) => {
    id = Number(id) || 0;

    if (id < 1) {
        return callback(new Error(_('Missing Template ID')));
    }

    db.getConnection((err, connection) => {
        if (err) {
            return callback(err);
        }

        connection.query('DELETE FROM templates WHERE id=? LIMIT 1', id, (err, result) => {
            connection.release();
            if (err) {
                return callback(err);
            }

            let affected = result && result.affectedRows || 0;

            return callback(null, affected);
        });
    });
};
