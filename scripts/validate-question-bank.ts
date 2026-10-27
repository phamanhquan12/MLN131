import bank from "../src/data/questions.json";
import { validateBank } from "../src/domain/questions";
validateBank(bank);
console.log(`${bank.bankVersion}: 125 câu hợp lệ, 25 câu mỗi tầng.`);
