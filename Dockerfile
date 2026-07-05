FROM node:22

WORKDIR /app

COPY paskage*.json ./

CMD ["tail", "-f", "/dev/null"]
