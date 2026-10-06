#!/usr/bin/env bash
set -euo pipefail

database_file=/var/lib/xiaoqingnang/content.db
upload_dir=/var/lib/xiaoqingnang/uploads
backup_dir=/var/backups/xiaoqingnang
stamp=$(/usr/bin/date +%Y%m%d-%H%M%S)

/usr/bin/install -d -m 750 "$backup_dir"
/usr/bin/sqlite3 "$database_file" ".backup '$backup_dir/content-$stamp.sqlite'"
/usr/bin/tar -C /var/lib/xiaoqingnang -czf "$backup_dir/uploads-$stamp.tar.gz" uploads
/usr/bin/find "$backup_dir" -type f -mtime +14 -delete
