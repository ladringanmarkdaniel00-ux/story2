import fs from 'fs';

let code = fs.readFileSync('src/features/posts/hooks/useEditPost.ts', 'utf8');

code = code.replace(
  "return userRole === 'admin';",
  "if (userRole === 'admin') return true;\n    return Boolean(post.authorId && currentUserId && post.authorId === currentUserId);"
);
code = code.replace(
  "}, [userRole]);",
  "}, [userRole, post.authorId, currentUserId]);"
);

fs.writeFileSync('src/features/posts/hooks/useEditPost.ts', code);
