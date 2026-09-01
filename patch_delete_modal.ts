import fs from 'fs';

let code = fs.readFileSync('src/features/posts/components/DeletePostModal.tsx', 'utf8');

code = code.replace(
  "return userRole === 'admin';",
  "if (userRole === 'admin') return true;\n    return Boolean(postAuthorId && currentUserId && postAuthorId === currentUserId);"
);

fs.writeFileSync('src/features/posts/components/DeletePostModal.tsx', code);
