const m = require('mongoose');
m.connect('mongodb+srv://abdulhameethum_db_user:abdul1234@cluster0.aqgkeye.mongodb.net/amazon_like?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
    const Schema = m.Schema;
    const testSchema = new Schema({ val: Date });
    const T = m.models.TestLte || m.model('TestLte', testSchema);
    await T.deleteMany({});
    
    // Test with missing date, null date, and valid date
    await T.insertMany([
        { val: new Date() },
        { },
        { val: null }
    ]);
    
    const res = await T.find({ val: { $lte: new Date() } });
    console.log('Matched documents:', res.map(r => r.toObject()));
    process.exit(0);
});
