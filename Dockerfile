FROM quay.io/lyfe00011/md:beta
RUN git clone https://github.com/shefin-x3/Asena.git /asena
WORKDIR /asena
RUN yarn install --network-concurrency 1
CMD ["node", "index.js"]
