const fs=require("fs");
const {Pool}=require("pg");
require("dotenv").config({path: ".env.local"});

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const data=JSON.parse(fs.readFileSync("idilesom-tours.json","utf8"));

async function main(){
  await pool.query(`
    DROP TABLE IF EXISTS places;
    CREATE TABLE places (
      id VARCHAR(20) PRIMARY KEY,
      name TEXT,
      description TEXT,
      category TEXT,
      category_slug TEXT,
      lat DECIMAL(10,8),
      lng DECIMAL(11,8),
      district TEXT,
      length_km DECIMAL(6,2),
      duration VARCHAR(50),
      difficulty VARCHAR(50),
      images JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  let count=0;
  for(const cat of Object.values(data)){
    for(const item of cat.items){
      item.description = (item.description||"")
        .replace(/на ИдиЛесом\.?/gi, "на КамчатурХаб.")
        .replace(/ИдиЛесом/gi, "КамчатурХаб")
        .replace(/Маршрут и все подробности на КамчатурХаб\./gi, "")
        .replace(/Место, которое стоит посмотреть\./gi, "")
        .trim();
      await pool.query(
        `INSERT INTO places (id,name,description,category,category_slug,lat,lng,district,length_km,duration,difficulty,images)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,lat=EXCLUDED.lat,lng=EXCLUDED.lng`,
        [item.id,item.name,item.description,item.category,item.category_slug,
         item.lat,item.lng,item.district,item.length_km,item.duration,item.difficulty,
         JSON.stringify(item.images)]
      );
      count++;
    }
  }
  console.log("Импортировано:",count,"маршрутов");
  await pool.end();
}
main().catch(console.error);
