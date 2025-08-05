import { Redis } from "@upstash/redis";
import { getPopLibraries } from "./app/utils";
import { config } from 'dotenv';

config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});


async function main() {
    const topPopLibraries = await getPopLibraries(1);
    for (const library of topPopLibraries) {
        const key = `#guide#${library}`;
        const scores = await redis.lrange(key, 0, -1);
        console.log(scores);


    }
}

main();