# --- Estágio 1: Build ---
# Usamos uma imagem Node.js completa para instalar dependências e compilar o código
FROM node:20-slim AS builder

# Define o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copia os arquivos de manifesto de pacotes
COPY package*.json ./

# Instala as dependências de produção e desenvolvimento
RUN npm install

# Copia o resto do código-fonte do gateway
COPY . .

# Compila o TypeScript para JavaScript, o resultado vai para a pasta /dist
RUN npm run build

# --- Estágio 2: Produção ---
# Usamos uma imagem "slim" menor para a versão final, para segurança e eficiência
FROM node:20-slim

WORKDIR /usr/src/app

# Copia apenas os artefatos necessários do estágio de build
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./

# Expõe a porta que o gateway usa
EXPOSE 3000

# O comando final para iniciar o servidor quando o contêiner rodar
CMD [ "node", "dist/index.js" ]