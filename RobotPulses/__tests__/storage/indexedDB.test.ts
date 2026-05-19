describe('IndexedDB 存储模块测试', () => {
  describe('模块导入', () => {
    test('应该能够正确导入 indexedDB 模块', async () => {
      const { robotDB, initDatabase, closeDatabase } = await import('@/lib/storage/indexedDB');
      
      expect(robotDB).toBeDefined();
      expect(typeof robotDB.generateId).toBe('function');
      expect(typeof initDatabase).toBe('function');
      expect(typeof closeDatabase).toBe('function');
    });

    test('generateId 应该生成唯一的字符串 ID', async () => {
      const { robotDB } = await import('@/lib/storage/indexedDB');
      
      const id1 = robotDB.generateId();
      const id2 = robotDB.generateId();
      
      expect(typeof id1).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^snap_\d+_[a-z0-9]+/);
    });

    test('getPendingCount 应该返回待处理快照数量', async () => {
      const { robotDB } = await import('@/lib/storage/indexedDB');
      
      expect(typeof robotDB.getPendingCount).toBe('function');
      expect(typeof robotDB.getPendingCount()).toBe('number');
    });
  });

  describe('数据库操作方法存在性', () => {
    test('应该包含所有必要的数据库操作方法', async () => {
      const { robotDB } = await import('@/lib/storage/indexedDB');
      
      const expectedMethods = [
        'init',
        'generateId',
        'addSnapshot',
        'addSnapshotsBatch',
        'queueSnapshot',
        'flushBatch',
        'getSnapshot',
        'getSnapshotsByRobot',
        'getSnapshotCountByRobot',
        'getLatestSnapshot',
        'getTotalSnapshotCount',
        'deleteSnapshotsByRobot',
        'deleteOldSnapshots',
        'exportAllSnapshots',
        'clearAll',
        'close',
        'getPendingCount',
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof robotDB[method as keyof typeof robotDB]).toBe('function');
      });
    });
  });

  describe('ID 生成格式验证', () => {
    test('生成的 ID 应该符合预期格式', async () => {
      const { robotDB } = await import('@/lib/storage/indexedDB');
      
      for (let i = 0; i < 10; i++) {
        const id = robotDB.generateId();
        const parts = id.split('_');
        
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('snap');
        expect(/^\d+$/.test(parts[1])).toBe(true);
        expect(/^[a-z0-9]+$/.test(parts[2])).toBe(true);
      }
    });

    test('短时间内生成的 ID 应该是唯一的', async () => {
      const { robotDB } = await import('@/lib/storage/indexedDB');
      
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(robotDB.generateId());
      }
      
      expect(ids.size).toBe(100);
    });
  });
});
