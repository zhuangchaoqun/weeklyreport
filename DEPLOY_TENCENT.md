# 腾讯云部署与维护

生产站点运行在 `https://124.223.175.138/weekly`，由 Nginx 转发到本机 3000 端口的 `beio-weekly` systemd 服务。

## 数据持久化（每次维护必须遵守）

- SQLite 数据库和全部附件只存放在 `/var/lib/beio-weekly/`。
- 每个发布版本的 `data` 必须是指向 `/var/lib/beio-weekly` 的符号链接，严禁把数据库留在 release 目录。
- 发布前停止服务，并把 `/var/lib/beio-weekly/` 完整复制到带时间戳的 `/var/backups/beio-weekly/` 目录。
- 数据库变更只使用 `CREATE TABLE/INDEX IF NOT EXISTS` 等向后兼容迁移，不删除或重建已有表。
- 发布后核对 `users`、`reports`、`report_sections`、`comments`、`attachments` 的记录数，并实际重启一次服务复核。
- 回滚只切换代码版本；所有版本继续使用同一持久数据目录。

## 必需环境变量

配置文件为 `/etc/beio-weekly.env`，权限应限制为仅管理员可读。至少需要：

```env
ADMIN_INVITE_CODE=替换为至少24位的随机字符串
APP_ORIGIN=https://124.223.175.138/weekly
```

修改配置后执行：

```bash
sudo systemctl restart beio-weekly
sudo systemctl is-active beio-weekly
```

## 当前业务规则

- 学生注册后必须由管理员审批，获批后才能进入系统。
- 学生可不限次数保存草稿；正式提交后不可修改或继续上传附件，直到导师退回。
- 导师可逐项点评、逐项上传附件、持续修改点评，也可填写原因并退回学生。
- 系统不发送邮件；忘记密码时联系管理员，由管理员在账号管理页直接设置临时密码。
- 管理员可以重置学生或管理员账号密码；重置后该账号的全部旧登录会话立即失效。
- 周次按自然周自动生成，寒暑假也连续填写。

## 安全与备份

- 腾讯云安全组只开放必要端口，管理员邀请码不得提交到代码仓库。
- 建议每天将 `/var/lib/beio-weekly/` 备份到另一块云盘或腾讯云 COS，并定期做恢复演练。
- 当前使用公网 IP 的证书信任体验有限；配置独立域名后应换成受信任的 HTTPS 证书。
