import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { AccountRepository } from '../repositories/AccountRepository'
import { MemberRepository } from '../repositories/MemberRepository'
import { CategoryRepository } from '../repositories/CategoryRepository'
import { generateId } from '@/lib/utils/ulid'
import { DEFAULT_CATEGORIES } from '@/lib/constants/pot'

export interface CreatePotParams {
    name: string
    emoji: string
    currency: string
}

export interface CreatePotResult {
    accountId: string
    kittyId: string
    categoryIds: string[]
}

/**
 * Creates a new pot with a kitty member and default categories.
 */
export async function createPot(
    db: SQLiteDBConnection,
    params: CreatePotParams
): Promise<CreatePotResult> {
    const now = new Date().toISOString()

    // 1. Create Account
    const accountId = generateId()
    const accountRepo = new AccountRepository(db)
    await accountRepo.create({
        id: accountId,
        name: params.name,
        emoji: params.emoji,
        currency: params.currency,
        balance: 0,
        created_at: now,
        updated_at: now,
    })

    // 2. Create Kitty Member
    const kittyId = generateId()
    const memberRepo = new MemberRepository(db)
    await memberRepo.create({
        id: kittyId,
        account_id: accountId,
        name: 'The Pot',
        role: 'owner',
        is_kitty: 1,
        created_at: now,
        updated_at: now,
    })

    // 3. Create Default Categories
    const categoryIds: string[] = []
    const categoryRepo = new CategoryRepository(db)

    for (const cat of DEFAULT_CATEGORIES) {
        const catId = generateId()
        categoryIds.push(catId)
        await categoryRepo.create({
            id: catId,
            account_id: accountId,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            created_at: now,
            updated_at: now,
        })
    }

    return { accountId, kittyId, categoryIds }
}
