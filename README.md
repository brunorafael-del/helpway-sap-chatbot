# HelpWay SAP - Knowledge Base AI

Este é um projeto full-stack (Vite + Express) com inteligência artificial integrada (Gemini API) para consulta de base de conhecimento SAP.

## 🚀 Como subir para o GitHub

1. Crie um novo repositório no seu GitHub.
2. No seu terminal local, dentro da pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

## ☁️ Como implantar no Vercel

1. Vá para o [Vercel Dashboard](https://vercel.com/dashboard).
2. Clique em **"Add New..."** > **"Project"**.
3. Importe o repositório que você acabou de criar.
4. **Configurações Importantes:**
   - O Vercel detectará automaticamente o Vite.
   - **Environment Variables:** Você PRECISA adicionar as seguintes variáveis:
     - `GEMINI_API_KEY`: Sua chave da API do Gemini.
     - `TESS_API_KEY`: Sua chave da API da plataforma TESS.
     - `NODE_ENV`: `production`
5. Clique em **Deploy**.

### ⚠️ Nota sobre o Banco de Dados (SQLite)
Este projeto utiliza SQLite (`better-sqlite3`), que é um banco de dados em arquivo. 
**O Vercel possui um sistema de arquivos somente leitura.** Isso significa que:
- O banco de dados funcionará para leitura se você subir o arquivo `.db` junto.
- **Novas inserções ou deleções NÃO serão persistidas** entre reinicializações do servidor no Vercel.

**Recomendação:** Para produção real no Vercel, substitua o SQLite por um banco de dados em nuvem como **Vercel Postgres**, **Supabase** ou **MongoDB**.

## 🛠️ Estrutura do Projeto

- `/src`: Frontend em React + Tailwind CSS.
- `/server.ts`: Servidor Express (Backend).
- `/api/index.ts`: Ponto de entrada para Serverless Functions do Vercel.
- `/vercel.json`: Configuração de rotas e build para o Vercel.
- `knowledge_base.db`: Arquivo do banco de dados SQLite.
