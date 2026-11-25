import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  belongsToProject,
  filterThreadsByCustomer,
  ratingDistribution,
  averageRating,
  filterReviewsByRating,
  clampRating,
  avatarInitial,
  isDemoProject,
  formatClock,
} from '../src/console/tabs/tabUtils.ts'
import type { ChatThread, SatisfactionItem } from '../src/console/mockConsoleData.ts'

const thread = (id: string, customerName: string): ChatThread => ({
  id,
  projectId: 'proj-a',
  customerName,
  channel: 'LINE OA',
  lastMessage: '',
  updatedAt: '',
  messages: [],
})

const review = (id: string, rating: number, createdAt: string): SatisfactionItem => ({
  id,
  projectId: 'proj-a',
  customerName: 'x',
  ticketCode: 'T',
  rating,
  comment: '',
  createdAt,
})

test('belongsToProject: ร้านตัวอย่างที่มีรหัสผู้ใช้ต่อท้ายยังเห็นข้อมูลของตัวเอง', () => {
  assert.equal(belongsToProject('proj-air-rama2', 'proj-air-rama2'), true)
  assert.equal(belongsToProject('proj-air-rama2', 'proj-air-rama2-abc123'), true)
  assert.equal(belongsToProject('proj-air', 'proj-air-rama2-abc123'), false)
  assert.equal(belongsToProject('proj-car-somchai', 'proj-air-rama2-abc123'), false)
})

test('filterThreadsByCustomer: ค้นหาชื่อลูกค้าแบบไม่สนตัวพิมพ์และช่องว่าง', () => {
  const threads = [thread('1', 'คุณพิมพ์ชนก'), thread('2', 'คุณธนพล'), thread('3', 'John Doe')]
  assert.equal(filterThreadsByCustomer(threads, '').length, 3)
  assert.deepEqual(filterThreadsByCustomer(threads, ' ธนพล ').map((t) => t.id), ['2'])
  assert.deepEqual(filterThreadsByCustomer(threads, 'john').map((t) => t.id), ['3'])
  assert.equal(filterThreadsByCustomer(threads, 'ไม่มีชื่อนี้').length, 0)
})

test('ratingDistribution: นับแต่ละดาวและคิดเปอร์เซ็นต์', () => {
  const dist = ratingDistribution([review('a', 5, '1'), review('b', 5, '2'), review('c', 4, '3'), review('d', 1, '4')])
  assert.deepEqual(dist.map((d) => d.star), [5, 4, 3, 2, 1])
  assert.deepEqual(dist.map((d) => d.count), [2, 1, 0, 0, 1])
  assert.deepEqual(dist.map((d) => d.percent), [50, 25, 0, 0, 25])
  assert.deepEqual(ratingDistribution([]).map((d) => d.percent), [0, 0, 0, 0, 0])
})

test('averageRating: ทศนิยม 1 ตำแหน่ง และ 0.0 เมื่อไม่มีรีวิว', () => {
  assert.equal(averageRating([]), '0.0')
  assert.equal(averageRating([review('a', 5, '1'), review('b', 4, '2')]), '4.5')
})

test('filterReviewsByRating: กรองตามดาวและเรียงใหม่สุดก่อน', () => {
  const list = [review('a', 5, '2026-11-20'), review('b', 4, '2026-11-23'), review('c', 5, '2026-11-22')]
  assert.deepEqual(filterReviewsByRating(list, null).map((r) => r.id), ['b', 'c', 'a'])
  assert.deepEqual(filterReviewsByRating(list, 5).map((r) => r.id), ['c', 'a'])
  assert.equal(filterReviewsByRating(list, 3).length, 0)
})

test('clampRating: คะแนนเพี้ยนไม่ทำให้หน้าพัง', () => {
  assert.equal(clampRating(4.6), 5)
  assert.equal(clampRating(7), 5)
  assert.equal(clampRating(-2), 0)
  assert.equal(clampRating(Number.NaN), 0)
  // รีวิวคะแนนเกิน 5 ถูกนับเป็น 5 ดาว ไม่หายจากกราฟ
  assert.deepEqual(ratingDistribution([review('a', 6, '1')]).map((d) => d.count), [1, 0, 0, 0, 0])
})

test('avatarInitial: ข้าม "คุณ" และสระหน้า', () => {
  assert.equal(avatarInitial('คุณพิมพ์ชนก'), 'พ')
  assert.equal(avatarInitial('คุณเอก'), 'อ')
  assert.equal(avatarInitial('ไก่'), 'ก')
  assert.equal(avatarInitial('john'), 'J')
  assert.equal(avatarInitial('   '), '?')
})

test('isDemoProject: แยกร้านตัวอย่างออกจากร้านจริง', () => {
  assert.equal(isDemoProject('proj-air-rama2'), true)
  assert.equal(isDemoProject('proj-air-rama2-cmwu79'), true)
  assert.equal(isDemoProject('cmf0x1y2z0000abcd'), false)
  assert.equal(isDemoProject(''), false)
})

test('formatClock: เติมศูนย์ข้างหน้า', () => {
  assert.equal(formatClock(new Date(2026, 10, 25, 9, 5)), '09:05')
  assert.equal(formatClock(new Date(2026, 10, 25, 14, 30)), '14:30')
})
