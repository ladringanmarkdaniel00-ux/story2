import fs from 'fs';

let authCode = fs.readFileSync('src/lib/core/auth.ts', 'utf8');
authCode = authCode.replace(
  "return role === 'admin';",
  "if (role === 'admin') return true;\n  return Boolean(authorId && currentUserId && authorId === currentUserId);"
);
fs.writeFileSync('src/lib/core/auth.ts', authCode);

let testCode = fs.readFileSync('src/lib/core/auth.test.ts', 'utf8');
testCode = testCode.replace(
  "it('returns false if authorId matches currentUserId but role is not admin', () => {\n      expect(isResourceOwnerOrAdmin('userA', 'userA', 'client')).toBe(false);\n    });",
  "it('returns true if authorId matches currentUserId', () => {\n      expect(isResourceOwnerOrAdmin('userA', 'userA', 'client')).toBe(true);\n    });"
);
fs.writeFileSync('src/lib/core/auth.test.ts', testCode);
