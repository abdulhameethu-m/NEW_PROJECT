const fs = require('fs');
const file = 'src/repositories/order.repository.js';
let content = fs.readFileSync(file, 'utf8');

// Update list
content = content.replace(
  'async list({',
  'async list({\n    cursor = null,'
);
content = content.replace(
  '    const skip = (page - 1) * limit;',
  `    if (cursor) {
      try {
        const cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const op = sortOrder === -1 ? '$lt' : '$gt';
        if (cursorObj[sortBy] !== undefined && cursorObj._id) {
          query.$or = [
            { [sortBy]: { [op]: cursorObj[sortBy] } },
            { [sortBy]: cursorObj[sortBy], _id: { [op]: cursorObj._id } }
          ];
        }
      } catch (e) {}
    }
    const skip = cursor ? 0 : (page - 1) * limit;`
);
content = content.replace(
  'const sort = { [sortBy]: sortOrder };',
  'const sort = { [sortBy]: sortOrder, _id: sortOrder };'
);
content = content.replace(
  'orders,\n      pagination: {\n        total,\n        page,\n        limit,\n        pages: Math.ceil(total / limit),\n      },',
  `orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        nextCursor: orders.length === limit ? Buffer.from(JSON.stringify({
          [sortBy]: orders[orders.length - 1][sortBy],
          _id: orders[orders.length - 1]._id
        })).toString('base64') : null,
      },`
);

// Update listByUserId
content = content.replace(
  'async listByUserId({',
  'async listByUserId({\n    cursor = null,'
);
content = content.replace(
  '    const skip = (page - 1) * limit;',
  `    if (cursor) {
      try {
        const cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const op = sortOrder === -1 ? '$lt' : '$gt';
        if (cursorObj[sortBy] !== undefined && cursorObj._id) {
          query.$or = [
            { [sortBy]: { [op]: cursorObj[sortBy] } },
            { [sortBy]: cursorObj[sortBy], _id: { [op]: cursorObj._id } }
          ];
        }
      } catch (e) {}
    }
    const skip = cursor ? 0 : (page - 1) * limit;`
);
content = content.replace(
  'const sort = { [sortBy]: sortOrder };',
  'const sort = { [sortBy]: sortOrder, _id: sortOrder };'
);
content = content.replace(
  'orders,\n      pagination: {\n        total,\n        page,\n        limit,\n        pages: Math.ceil(total / limit),\n      },',
  `orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        nextCursor: orders.length === limit ? Buffer.from(JSON.stringify({
          [sortBy]: orders[orders.length - 1][sortBy],
          _id: orders[orders.length - 1]._id
        })).toString('base64') : null,
      },`
);

// Update listBySellerId
content = content.replace(
  'async listBySellerId({',
  'async listBySellerId({\n    cursor = null,'
);
content = content.replace(
  '    const skip = (page - 1) * limit;',
  `    if (cursor) {
      try {
        const cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const op = sortOrder === -1 ? '$lt' : '$gt';
        if (cursorObj[sortBy] !== undefined && cursorObj._id) {
          query.$or = [
            { [sortBy]: { [op]: cursorObj[sortBy] } },
            { [sortBy]: cursorObj[sortBy], _id: { [op]: cursorObj._id } }
          ];
        }
      } catch (e) {}
    }
    const skip = cursor ? 0 : (page - 1) * limit;`
);
content = content.replace(
  'const sort = { [sortBy]: sortOrder };',
  'const sort = { [sortBy]: sortOrder, _id: sortOrder };'
);
content = content.replace(
  'orders,\n      pagination: {\n        total,\n        page,\n        limit,\n        pages: Math.ceil(total / limit),\n      },',
  `orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        nextCursor: orders.length === limit ? Buffer.from(JSON.stringify({
          [sortBy]: orders[orders.length - 1][sortBy],
          _id: orders[orders.length - 1]._id
        })).toString('base64') : null,
      },`
);

fs.writeFileSync(file, content);
console.log('Done cursor pagination in order.repository');
