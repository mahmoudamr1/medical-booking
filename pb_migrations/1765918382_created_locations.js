/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "iwbg7jntq6ufng9",
    "created": "2025-12-16 20:53:02.495Z",
    "updated": "2025-12-16 20:53:02.495Z",
    "name": "locations",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "qzqzavx0",
        "name": "governorate",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "sukgzswo",
        "name": "area",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("iwbg7jntq6ufng9");

  return dao.deleteCollection(collection);
})
