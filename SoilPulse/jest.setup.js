const FDB = require('fake-indexeddb');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = FDB;
global.IDBKeyRange = FDBKeyRange;

require('@testing-library/jest-dom');
