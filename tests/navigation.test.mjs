import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNavigation } from '../services/navigation.js';

const items = [
    { path: '/overview', label: 'Overview', roles: ['MANAGER', 'ANALYST'] },
    { path: '/rules', label: 'Detection Rules', roles: ['MANAGER'] },
    { path: '/alerts', label: 'Alerts', roles: ['ANALYST'] }
];

test('navigation search returns only destinations allowed for the current role', () => {
    assert.deepEqual(filterNavigation(items, 'alert', 'MANAGER'), []);
    assert.deepEqual(filterNavigation(items, 'alert', 'ANALYST').map(item => item.path), ['/alerts']);
});

test('navigation search is case-insensitive and matches all allowed items when empty', () => {
    assert.deepEqual(filterNavigation(items, 'DETECT', 'manager').map(item => item.path), ['/rules']);
    assert.deepEqual(filterNavigation(items, '', 'MANAGER').map(item => item.path), ['/overview', '/rules']);
});
