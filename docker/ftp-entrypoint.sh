#!/bin/sh
set -eu

FTP_USER="${FTP_USER:-lunnacoco_ftp}"
FTP_PASS="${FTP_PASS:-}"
FTP_PASV_ADDRESS="${FTP_PASV_ADDRESS:-}"
FTP_PASV_MIN="${FTP_PASV_MIN:-30000}"
FTP_PASV_MAX="${FTP_PASV_MAX:-30009}"

if [ -z "$FTP_PASS" ]; then
  FTP_PASS="$(openssl rand -base64 18)"
  echo "[FTP] AVISO: FTP_PASS no estaba definido en .env. Se generó una contraseña temporal para esta sesión."
fi

if ! id "$FTP_USER" >/dev/null 2>&1; then
  adduser -D -h "/home/${FTP_USER}" -s /sbin/nologin "$FTP_USER"
fi

echo "${FTP_USER}:${FTP_PASS}" | chpasswd

mkdir -p "/home/${FTP_USER}/inbox"
chown -R "${FTP_USER}:${FTP_USER}" "/home/${FTP_USER}"
chmod 755 "/home/${FTP_USER}"
chmod 777 "/home/${FTP_USER}/inbox"

cat <<EOF > /etc/vsftpd/vsftpd.conf
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=0022
chroot_local_user=YES
allow_writeable_chroot=YES
local_root=/home/${FTP_USER}/inbox
seccomp_sandbox=NO
pasv_enable=YES
pasv_min_port=${FTP_PASV_MIN}
pasv_max_port=${FTP_PASV_MAX}
pasv_addr_resolve=YES
xferlog_enable=YES
xferlog_std_format=NO
log_ftp_protocol=NO
use_localtime=YES
background=NO
EOF

if [ -n "$FTP_PASV_ADDRESS" ]; then
  echo "pasv_address=${FTP_PASV_ADDRESS}" >> /etc/vsftpd/vsftpd.conf
fi

echo "[FTP] Servidor vsftpd escuchando en puerto 21 (pasivo ${FTP_PASV_MIN}-${FTP_PASV_MAX}) -> /home/${FTP_USER}/inbox"
exec /usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf
