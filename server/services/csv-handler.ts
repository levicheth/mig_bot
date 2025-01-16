import { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      parsedCsv?: any[];
    }
  }
}

export const csvParser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.is('text/csv')) {
    return res.status(400).send('Content-Type must be text/csv');
  }

  const chunks: Buffer[] = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const csvData = Buffer.concat(chunks).toString();

    parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) {
        console.error('CSV parsing error:', err);
        return res.status(400).send('Invalid CSV format');
      }

      // Validate CSV data
      if (!records || !records.length) {
        return res.status(400).send('CSV contains no valid data');
      }

      // Attach parsed data to request object
      req.parsedCsv = records;
      next();
    });
  });

  req.on('error', (err) => {
    console.error('Error reading CSV data:', err);
    res.status(500).send('Error processing CSV file');
  });
};
