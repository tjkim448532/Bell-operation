import fs from 'fs';
import xlsx from 'xlsx';
import crypto from 'crypto';

// Extract the actual logic we modified in parser.ts to test it locally
function testParser(filePath: string) {
  console.log('Testing parser on:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const records: any[] = [];
  
  let droppedAmount0 = 0;
  let droppedDate = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log(`\n--- Sheet: ${sheetName} ---`);
    console.log(`Total rows in sheet: ${jsonData.length}`);

    let headerRowIdx = -1;
    let flatHeaders: string[] = [];

    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const rowStr = JSON.stringify(jsonData[i]);
      if (i === 0) console.log('Row 0:', rowStr);
      if (rowStr.includes('계정과목') || rowStr.includes('과목') || rowStr.includes('적요')) {
        headerRowIdx = i;
        
        const header1 = jsonData[i] || [];
        
        for(let c = 0; c < header1.length; c++) {
           const h1 = String(header1[c] || '').replace(/\s/g, '').toLowerCase();
           flatHeaders.push(h1);
        }
        break;
      }
    }

    if (headerRowIdx === -1) {
      console.warn(`Could not find header row in sheet: ${sheetName}`);
      continue;
    }

    const getColIdx = (possibleNames: string[]) => {
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i] === cleanName) return i;
        }
      }
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i].includes(cleanName)) return i;
        }
      }
      return -1;
    };

    const getColIndices = (possibleNames: string[]) => {
      const indices: number[] = [];
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i] === cleanName && !indices.includes(i)) {
            indices.push(i);
          }
        }
      }
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i].includes(cleanName) && !indices.includes(i)) {
            indices.push(i);
          }
        }
      }
      return indices;
    };

    const idxMap = {
      dateIndices: getColIndices(['작성일', '전표일자', '일자', 'date', '승인일', 'ㅋㅋ', '']),
      term: getColIdx(['계정과목명', '계정과목', '과목', '차변계정과목']),
      amount: getColIdx(['차변', '금액', '차변금액']),
      project: getColIdx(['프로젝트명', '프로젝트', 'project']),
      dept: getColIdx(['부서명', '부서', 'dept', '사용부서명', '본부명']),
      desc: getColIdx(['적요', '내용', 'desc']),
      vendor: getColIdx(['업체명', '업체', '거래처', '거래처명', 'vendor']),
      approval: getColIdx(['승인번호', '승인번호(세금계산서)', 'approval']),
      attrMonth: getColIdx(['귀속월', '귀속', 'attr_month'])
    };

    console.log('Flat Headers:', flatHeaders);
    console.log('Index Map:', idxMap);
    console.log('First 5 rows of raw data:');
    for(let r=0; r<5; r++) {
       console.log(`Row ${headerRowIdx + 1 + r}:`, jsonData[headerRowIdx + 1 + r]);
    }

    let lastVendor = '';
    let lastApproval = '';
    let lastAttrMonth = '';

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      let attr_month = idxMap.attrMonth !== -1 ? String(row[idxMap.attrMonth] || '').trim() : '';
      if (!attr_month) attr_month = lastAttrMonth;
      else lastAttrMonth = attr_month;

      const originalTerm = idxMap.term !== -1 ? String(row[idxMap.term] || '') : '';
      const description = idxMap.desc !== -1 ? String(row[idxMap.desc] || '') : '';
      
      let vendor = idxMap.vendor !== -1 ? String(row[idxMap.vendor] || '').trim() : '';
      if (!vendor) vendor = lastVendor;
      else lastVendor = vendor;

      let approval_number = idxMap.approval !== -1 ? String(row[idxMap.approval] || '').trim() : '';
      if (!approval_number) approval_number = lastApproval;
      else lastApproval = approval_number;

      let rawAmount = idxMap.amount !== -1 ? String(row[idxMap.amount] || '0') : '0';
      if (rawAmount.includes('(') && rawAmount.includes(')')) {
        rawAmount = '-' + rawAmount.replace(/[()]/g, '');
      }
      rawAmount = rawAmount.replace(/,/g, '').replace(/\s/g, '');
      const amount = parseFloat(rawAmount) || 0;

      if (amount === 0) {
         droppedAmount0++;
         continue; 
      }

      let dateVal = null;
      for (const idx of idxMap.dateIndices) {
        if (row[idx] !== undefined && String(row[idx]).trim() !== '') {
          dateVal = row[idx];
          break;
        }
      }

      if ((!dateVal || String(dateVal).trim() === '') && attr_month) {
        const m = attr_month.replace(/[^0-9]/g, '').padStart(2, '0');
        if (m && m !== '00') {
          dateVal = `2026-${m}-28`;
        }
      }

      if (!dateVal || String(dateVal).trim() === '') {
         droppedDate++;
         continue; 
      }
      
      const hashStr = `${dateVal}_${amount}_${description}_${vendor}_${sheetName}_ROW_${i}`;
      const hash = crypto.createHash('md5').update(hashStr).digest('hex');

      records.push({
        id: `exp_${hash}`,
        amount,
        vendor,
        approval_number,
        attr_month,
      });
    }
  }

  const uniqueRecords = new Map();
  records.forEach(r => uniqueRecords.set(r.id, r));

  const totalAmount = Array.from(uniqueRecords.values()).reduce((sum, r) => sum + r.amount, 0);
  
  console.log(`Parsed ${records.length} records. Unique records: ${uniqueRecords.size}`);
  console.log(`Total amount: ${totalAmount}`);
  console.log(`Dropped (Amount 0): ${droppedAmount0}`);
  console.log(`Dropped (No Date): ${droppedDate}`);
  
  const blankApproval = Array.from(uniqueRecords.values()).filter(r => !r.approval_number).length;
  const blankVendor = Array.from(uniqueRecords.values()).filter(r => !r.vendor).length;
  console.log(`Blank Approvals: ${blankApproval}`);
  console.log(`Blank Vendors: ${blankVendor}`);
}

testParser('E:\\\\앱\\\\Bell-operation\\\\src\\\\scripts\\\\original.xlsx');
