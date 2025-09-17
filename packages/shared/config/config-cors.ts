export function configureCors(whitelist: string[]) {
  return {
    origin: function (origin, callback) {
      if (!origin || whitelist.includes(origin)) {
        console.log('AI Allowed cors for:', origin ? origin : 'Local');
        callback(null, true);
      } else {
        console.warn('Blocked cors for:', origin ? origin : 'Local');
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
}
