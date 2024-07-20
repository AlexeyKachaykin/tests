import CartParser from './CartParser';
import { readFileSync } from 'fs';

let parser;

beforeEach(() => {
	parser = new CartParser();
});

describe('CartParser - unit tests', () => {
	test('readFile should return file contents', () => {
		const mockReadFileSync = jest.spyOn(require('fs'), 'readFileSync');
		mockReadFileSync.mockReturnValue('mock content');

		const result = parser.readFile('mockPath');
		expect(result).toBe('mock content');
		expect(mockReadFileSync).toHaveBeenCalledWith('mockPath', 'utf-8', 'r');

		mockReadFileSync.mockRestore();
	});

	test('validate should return no errors for valid CSV', () => {
		const validCSV = 'Product name,Price,Quantity\nItem,10.00,2';
		const errors = parser.validate(validCSV);
		expect(errors).toHaveLength(0);
	});

	test('validate should return header error for invalid header', () => {
		const invalidCSV = 'Invalid Header,Price,Quantity\nItem,10.00,2';
		const errors = parser.validate(invalidCSV);
		expect(errors).toHaveLength(1);
		expect(errors[0].type).toBe(parser.ErrorType.HEADER);
	});

	test('validate should return row error for missing cells', () => {
		const invalidCSV = 'Product name,Price,Quantity\nItem,10.00';
		const errors = parser.validate(invalidCSV);
		expect(errors).toHaveLength(1);
		expect(errors[0].type).toBe(parser.ErrorType.ROW);
	});

	test('validate should return cell error for invalid number', () => {
		const invalidCSV = 'Product name,Price,Quantity\nItem,invalid,2';
		const errors = parser.validate(invalidCSV);
		expect(errors).toHaveLength(1);
		expect(errors[0].type).toBe(parser.ErrorType.CELL);
	});

	test('parseLine should correctly parse a CSV line', () => {
		const csvLine = 'Test Item,15.99,3';
		const result = parser.parseLine(csvLine);
		expect(result).toEqual({
			name: 'Test Item',
			price: 15.99,
			quantity: 3,
			id: expect.any(String)
		});
	});

	test('calcTotal should correctly calculate total price', () => {
		const items = [
			{ price: 10, quantity: 2 },
			{ price: 5, quantity: 3 }
		];
		const total = parser.calcTotal(items);
		expect(total).toBe(35);
	});

	test('createError should return correct error object', () => {
		const error = parser.createError(parser.ErrorType.CELL, 1, 2, 'Test message');
		expect(error).toEqual({
			type: parser.ErrorType.CELL,
			row: 1,
			column: 2,
			message: 'Test message'
		});
	});

	test('parse should throw error for invalid CSV', () => {
		jest.spyOn(parser, 'readFile').mockReturnValue('Invalid CSV');
		expect(() => parser.parse('mockPath')).toThrow('Validation failed!');
	});

	test('parse should return correct JSON for valid CSV', () => {
		const mockCSV = 'Product name,Price,Quantity\nItem1,10.00,2\nItem2,15.50,1';
		jest.spyOn(parser, 'readFile').mockReturnValue(mockCSV);

		const result = parser.parse('mockPath');
		expect(result).toEqual({
			items: [
				{ name: 'Item1', price: 10, quantity: 2, id: expect.any(String) },
				{ name: 'Item2', price: 15.50, quantity: 1, id: expect.any(String) }
			],
			total: 35.50
		});
	});

	test('parse should handle empty lines in CSV', () => {
		const mockCSV = 'Product name,Price,Quantity\nItem1,10.00,2\n\nItem2,15.50,1\n';
		jest.spyOn(parser, 'readFile').mockReturnValue(mockCSV);

		const result = parser.parse('mockPath');
		expect(result.items).toHaveLength(2);
		expect(result.total).toBe(35.50);
	});
});

describe('CartParser - integration test', () => {
	test('should correctly parse a real CSV file', () => {
		const parser = new CartParser();
		const result = parser.parse('./samples/cart.csv');

		expect(result).toHaveProperty('items');
		expect(result.items).toHaveLength(5);
		expect(result).toHaveProperty('total');
		expect(typeof result.total).toBe('number');

		const firstItem = result.items[0];
		expect(firstItem).toHaveProperty('name', 'Mollis consequat');
		expect(firstItem).toHaveProperty('price', 9);
		expect(firstItem).toHaveProperty('quantity', 3);
		expect(firstItem).toHaveProperty('id');

		expect(result.total).toBeCloseTo(400.44, 2);
	});
});