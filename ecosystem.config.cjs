module.exports = {
  apps: [{
    name: 'kings-vr-control',
    script: 'server.js',
    cwd: '/home/ubuntu/apps/kings-vr-control',
    env: {
      NODE_ENV: 'production',
      PORT: 3206
    },
    max_memory_restart: '250M',
    restart_delay: 2000,
    time: true
  }]
};
