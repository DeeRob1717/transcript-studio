FROM ghcr.io/ggml-org/whisper.cpp:main

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates nodejs npm \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY models ./models

ENV PORT=8080
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV WHISPER_CPP_EXE=whisper-cli

EXPOSE 8080

CMD ["npm", "start"]
