module.exports = {
    apps: [{
        name: 'mactabak-bot',
        script: './bot.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        merge_logs: true,
        exec_mode: 'fork',
        min_uptime: '10s',
        max_restarts: 10,
        restart_delay: 4000
    }]
};