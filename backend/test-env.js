require("dotenv").config();
console.log("PAYOUT_DELAY_DAYS string:", process.env.PAYOUT_DELAY_DAYS);
console.log("Number config:", Number(process.env.PAYOUT_DELAY_DAYS || 7));
