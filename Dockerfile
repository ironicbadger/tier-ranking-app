FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js config.md /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 80
