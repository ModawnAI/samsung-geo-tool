import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS for migration
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const SAMSUNG_CATEGORIES = [
  { name: 'Featured', name_ko: '기획전', icon: 'star', sort_order: 1 },
  { name: 'Mobile', name_ko: '모바일', icon: 'device-mobile', sort_order: 2 },
  { name: 'TV & Audio', name_ko: 'TV/영상·음향', icon: 'tv', sort_order: 3 },
  { name: 'Kitchen', name_ko: '주방가전', icon: 'cooking-pot', sort_order: 4 },
  { name: 'Living', name_ko: '리빙가전', icon: 'house', sort_order: 5 },
  { name: 'PC & Peripherals', name_ko: 'PC/주변기기', icon: 'laptop', sort_order: 6 },
  { name: 'Wearables', name_ko: '웨어러블', icon: 'watch', sort_order: 7 },
  { name: 'Harman', name_ko: '하만', icon: 'speaker-high', sort_order: 8 },
  { name: 'Accessories', name_ko: '소모품/액세서리', icon: 'bag', sort_order: 9 },
  { name: 'AI Club', name_ko: 'AI 구독클럽', icon: 'robot', sort_order: 10 },
]

const PRODUCTS_DATA: Record<string, Array<{ name: string; code_name: string; image_path: string; usps: string[] }>> = {
  'Featured': [
    { name: 'Galaxy Z Fold 7', code_name: 'fold7', image_path: '/products/featured/galaxy-z-fold7.png', usps: ['AI', '폴더블', '멀티태스킹', 'S펜'] },
    { name: 'Galaxy Z Flip 7', code_name: 'flip7', image_path: '/products/featured/galaxy-z-flip7.png', usps: ['AI', '플립', '컴팩트', '플렉스캠'] },
    { name: 'Galaxy S25 Ultra', code_name: 's25-ultra', image_path: '/products/featured/galaxy-s25-ultra.png', usps: ['AI', '프로급 카메라', 'S펜'] },
    { name: 'Galaxy Tab S10', code_name: 'tab-s10', image_path: '/products/featured/galaxy-tab-s10.png', usps: ['AI', '태블릿', 'S펜', '생산성'] },
    { name: 'Galaxy Watch 8', code_name: 'watch8', image_path: '/products/featured/galaxy-watch8.png', usps: ['헬스', 'AI', '수면분석', 'BioActive'] },
    { name: 'Galaxy Book 5 시리즈', code_name: 'book5', image_path: '/products/featured/galaxy-book5-series.png', usps: ['AI PC', '휴대성', '연결성'] },
    { name: 'Neo QLED', code_name: 'neo-qled', image_path: '/products/featured/neo-qled.png', usps: ['화질', 'AI 업스케일링', '미니LED'] },
    { name: 'QLED', code_name: 'qled', image_path: '/products/featured/qled.png', usps: ['퀀텀닷', '색재현', '4K'] },
    { name: 'BESPOKE AI 콤보', code_name: 'ai-combo', image_path: '/products/featured/bespoke-ai-combo.png', usps: ['AI', '세탁건조', '올인원'] },
    { name: 'BESPOKE AI 하이브리드', code_name: 'ai-hybrid', image_path: '/products/featured/bespoke-ai-hybrid.png', usps: ['AI', '냉장고', '패밀리허브'] },
    { name: 'BESPOKE AI 제트', code_name: 'ai-jet', image_path: '/products/featured/bespoke-ai-jet.png', usps: ['AI', '청소기', '무선'] },
    { name: '인피니트 AI 식기세척기', code_name: 'infinite-dishwasher', image_path: '/products/featured/infinite-ai-dishwasher.png', usps: ['AI', '식기세척', '절수'] },
    { name: '갤러리 에어컨', code_name: 'gallery-ac', image_path: '/products/featured/air-conditioner-gallery.png', usps: ['AI', '냉난방', '인테리어'] },
    { name: '무빙 스타일', code_name: 'moving-style', image_path: '/products/featured/moving-style.png', usps: ['보관', '이동', '인테리어'] },
  ],
  'Mobile': [
    { name: 'Galaxy 스마트폰', code_name: 'mobile-smartphone', image_path: '/products/mobile/mobile-galaxy-smartphone.png', usps: ['Galaxy AI', '카메라', '퍼포먼스'] },
    { name: 'Galaxy 탭', code_name: 'mobile-tab', image_path: '/products/mobile/mobile-galaxy-tab.png', usps: ['태블릿', 'S펜', '생산성'] },
    { name: 'Galaxy 워치', code_name: 'mobile-watch', image_path: '/products/mobile/mobile-galaxy-watch.png', usps: ['헬스', '웨어러블', '피트니스'] },
    { name: 'Galaxy 버즈', code_name: 'mobile-buds', image_path: '/products/mobile/mobile-galaxy-buds.png', usps: ['오디오', 'ANC', '통화품질'] },
    { name: 'Galaxy 링', code_name: 'mobile-ring', image_path: '/products/mobile/mobile-galaxy-ring.png', usps: ['헬스', '미니멀', '수면추적'] },
    { name: 'Galaxy 북', code_name: 'mobile-book', image_path: '/products/mobile/mobile-galaxy-book.png', usps: ['AI PC', '휴대성', '연결성'] },
    { name: 'Galaxy XR', code_name: 'mobile-xr', image_path: '/products/mobile/mobile-galaxy-xr.png', usps: ['확장현실', '몰입', '공간컴퓨팅'] },
    { name: 'Galaxy 액세서리', code_name: 'mobile-accessories', image_path: '/products/mobile/mobile-galaxy-accessories.png', usps: ['케이스', '충전기', '보호'] },
    { name: '인증 리퍼비시', code_name: 'mobile-renewed', image_path: '/products/mobile/mobile-galaxy-certified-renewed.png', usps: ['친환경', '가성비', '인증품질'] },
  ],
  'TV & Audio': [
    { name: 'Neo QLED TV', code_name: 'tv-neo-qled', image_path: '/products/tv-audio/tv-neo-qled.png', usps: ['미니LED', 'AI 업스케일링', '화질'] },
    { name: 'OLED TV', code_name: 'tv-oled', image_path: '/products/tv-audio/tv-oled.png', usps: ['퍼펙트 블랙', '화질', '디자인'] },
    { name: 'QLED TV', code_name: 'tv-qled', image_path: '/products/tv-audio/tv-qled.png', usps: ['퀀텀닷', '색재현', '4K'] },
    { name: 'Crystal UHD', code_name: 'tv-crystal', image_path: '/products/tv-audio/tv-crystal-uhd.png', usps: ['4K', '크리스탈 프로세서'] },
    { name: 'The Frame', code_name: 'tv-frame', image_path: '/products/tv-audio/tv-the-frame.png', usps: ['아트모드', '인테리어', '디자인'] },
    { name: 'The Serif', code_name: 'tv-serif', image_path: '/products/tv-audio/tv-the-serif.png', usps: ['디자인', '인테리어', '라이프스타일'] },
    { name: 'The Sero', code_name: 'tv-sero', image_path: '/products/tv-audio/tv-the-sero.png', usps: ['회전스크린', '모바일연동'] },
    { name: '프로젝터', code_name: 'tv-projector', image_path: '/products/tv-audio/tv-projector.png', usps: ['대화면', '포터블', '스마트'] },
    { name: 'Micro LED', code_name: 'tv-micro', image_path: '/products/tv-audio/tv-micro-rgb.png', usps: ['프리미엄', '모듈러', '화질'] },
    { name: '삼성 오디오', code_name: 'tv-audio', image_path: '/products/tv-audio/tv-samsung-audio.png', usps: ['사운드바', '서라운드', '돌비'] },
    { name: 'TV 액세서리', code_name: 'tv-accessories', image_path: '/products/tv-audio/tv-accessories.png', usps: ['리모컨', '마운트', '케이블'] },
    { name: 'TV 무빙 스타일', code_name: 'tv-moving', image_path: '/products/tv-audio/tv-moving-style.png', usps: ['스탠드', '이동식', '인테리어'] },
  ],
  'Kitchen': [
    { name: '냉장고', code_name: 'kitchen-fridge', image_path: '/products/kitchen/kitchen-refrigerator.png', usps: ['AI', '신선보관', 'BESPOKE'] },
    { name: '김치냉장고', code_name: 'kitchen-kimchi', image_path: '/products/kitchen/kitchen-kimchi-refrigerator.png', usps: ['김치숙성', '신선보관'] },
    { name: '식기세척기', code_name: 'kitchen-dish', image_path: '/products/kitchen/kitchen-dishwasher.png', usps: ['AI', '절수', '세척력'] },
    { name: '인덕션', code_name: 'kitchen-induction', image_path: '/products/kitchen/kitchen-induction.jpg', usps: ['화력', '안전', '스마트'] },
    { name: '후드', code_name: 'kitchen-hood', image_path: '/products/kitchen/kitchen-hood.png', usps: ['환기', '디자인', '저소음'] },
    { name: '전자레인지', code_name: 'kitchen-microwave', image_path: '/products/kitchen/kitchen-microwave.png', usps: ['편의성', '스마트쿠킹'] },
    { name: '쿠커/오븐', code_name: 'kitchen-oven', image_path: '/products/kitchen/kitchen-qooker-oven.png', usps: ['스마트쿠킹', '다양한요리'] },
    { name: '정수기', code_name: 'kitchen-water', image_path: '/products/kitchen/kitchen-water-purifier.png', usps: ['정수성능', '직수형'] },
    { name: '소형가전', code_name: 'kitchen-small', image_path: '/products/kitchen/kitchen-small-appliances.png', usps: ['편의성', '컴팩트'] },
    { name: 'Samsung Care+', code_name: 'kitchen-care', image_path: '/products/kitchen/kitchen-samsung-care.png', usps: ['연장보증', '수리'] },
    { name: '주방 액세서리', code_name: 'kitchen-acc', image_path: '/products/kitchen/kitchen-accessories.png', usps: ['부속품', '소모품'] },
  ],
  'Living': [
    { name: '세탁기/건조기', code_name: 'living-washer', image_path: '/products/living/living-washer-dryer.png', usps: ['AI', '세탁력', '건조'] },
    { name: '에어컨', code_name: 'living-ac', image_path: '/products/living/living-air-conditioner.png', usps: ['AI', '냉난방', '절전'] },
    { name: '공기청정기', code_name: 'living-purifier', image_path: '/products/living/living-air-purifier.png', usps: ['청정', '필터', 'PM2.5'] },
    { name: '에어드레서', code_name: 'living-dresser', image_path: '/products/living/living-airdresser.png', usps: ['의류관리', '탈취', '살균'] },
    { name: '청소기', code_name: 'living-vacuum', image_path: '/products/living/living-vacuum.png', usps: ['AI', '무선', '강력흡입'] },
    { name: '제습기', code_name: 'living-dehumid', image_path: '/products/living/living-dehumidifier.png', usps: ['습도조절', '에너지효율'] },
    { name: '시스템 에어컨', code_name: 'living-system-ac', image_path: '/products/living/living-system-aircon.png', usps: ['빌트인', '인테리어', '전체냉방'] },
    { name: '생활가전', code_name: 'living-small', image_path: '/products/living/living-small-appliances.png', usps: ['편의성', '다용도'] },
    { name: 'Samsung Care+', code_name: 'living-care', image_path: '/products/living/living-samsung-care.png', usps: ['연장보증', '수리'] },
    { name: '리빙 액세서리', code_name: 'living-acc', image_path: '/products/living/living-accessories.png', usps: ['부속품', '소모품'] },
  ],
  'PC & Peripherals': [
    { name: 'Galaxy Book', code_name: 'pc-book', image_path: '/products/pc/pc-galaxy-book.png', usps: ['AI PC', '휴대성', '연결성'] },
    { name: '모니터', code_name: 'pc-monitor', image_path: '/products/pc/pc-monitor.png', usps: ['화질', '게이밍', '눈건강'] },
    { name: '비즈니스 모니터', code_name: 'pc-biz-monitor', image_path: '/products/pc/pc-business-monitor.png', usps: ['업무효율', '멀티태스킹'] },
    { name: '데스크탑', code_name: 'pc-desktop', image_path: '/products/pc/pc-desktop.png', usps: ['퍼포먼스', '확장성'] },
    { name: '프린터', code_name: 'pc-printer', image_path: '/products/pc/pc-printer.png', usps: ['출력품질', '효율성'] },
    { name: '메모리/스토리지', code_name: 'pc-memory', image_path: '/products/pc/pc-memory-storage.png', usps: ['속도', '안정성', '용량'] },
    { name: '상업용 TV', code_name: 'pc-commercial', image_path: '/products/pc/pc-commercial-tv.png', usps: ['비즈니스', '디지털사이니지'] },
    { name: 'LED 사이니지', code_name: 'pc-led', image_path: '/products/pc/pc-led-signage.png', usps: ['대형디스플레이', '광고'] },
    { name: '스마트 사이니지', code_name: 'pc-smart', image_path: '/products/pc/pc-smart-signage.png', usps: ['인터랙티브', '비즈니스'] },
    { name: '토너/잉크', code_name: 'pc-toner', image_path: '/products/pc/pc-toner-ink.png', usps: ['인쇄품질', '경제성'] },
    { name: 'PC 액세서리', code_name: 'pc-acc', image_path: '/products/pc/pc-accessories.png', usps: ['마우스', '키보드', '허브'] },
    { name: 'PC 무빙 스타일', code_name: 'pc-moving', image_path: '/products/pc/pc-moving-style.png', usps: ['이동식', '보관'] },
  ],
  'Wearables': [
    { name: 'Galaxy 워치', code_name: 'wear-watch', image_path: '/products/wearables/wearable-galaxy-watch.png', usps: ['헬스', '피트니스', 'AI'] },
    { name: 'Galaxy 버즈', code_name: 'wear-buds', image_path: '/products/wearables/wearable-galaxy-buds.png', usps: ['오디오', 'ANC', '통화품질'] },
    { name: 'Galaxy 링', code_name: 'wear-ring', image_path: '/products/wearables/wearable-galaxy-ring.png', usps: ['헬스', '수면추적', '미니멀'] },
    { name: 'Galaxy XR', code_name: 'wear-xr', image_path: '/products/wearables/wearable-galaxy-xr.png', usps: ['확장현실', '몰입형경험'] },
    { name: '웨어러블 액세서리', code_name: 'wear-acc', image_path: '/products/wearables/wearable-accessories.png', usps: ['스트랩', '충전기'] },
  ],
  'Harman': [
    { name: 'JBL', code_name: 'harman-jbl', image_path: '/products/harman/harman-jbl.png', usps: ['스피커', '사운드', '포터블'] },
    { name: 'AKG', code_name: 'harman-akg', image_path: '/products/harman/harman-akg.png', usps: ['헤드폰', '프리미엄오디오'] },
    { name: 'Harman Kardon', code_name: 'harman-hk', image_path: '/products/harman/harman-harman-kardon.jpg', usps: ['프리미엄스피커', '디자인'] },
    { name: '스피커', code_name: 'harman-speaker', image_path: '/products/harman/harman-speaker.png', usps: ['사운드', '블루투스'] },
    { name: '사운드바', code_name: 'harman-soundbar', image_path: '/products/harman/harman-soundbar.png', usps: ['TV오디오', '서라운드'] },
    { name: '헤드폰', code_name: 'harman-headphone', image_path: '/products/harman/harman-headphone.png', usps: ['음질', 'ANC', '프리미엄'] },
    { name: '이어폰', code_name: 'harman-earphone', image_path: '/products/harman/harman-earphone.png', usps: ['무선', '편의성', '음질'] },
    { name: '럭셔리', code_name: 'harman-luxury', image_path: '/products/harman/harman-luxury.png', usps: ['프리미엄', '하이엔드'] },
    { name: '퀀텀 게이밍', code_name: 'harman-quantum', image_path: '/products/harman/harman-quantum-gaming.png', usps: ['게이밍오디오', '저지연'] },
    { name: 'Arcam', code_name: 'harman-arcam', image_path: '/products/harman/harman-arcam.png', usps: ['하이파이', '앰프'] },
  ],
  'Accessories': [
    { name: 'Galaxy 액세서리', code_name: 'acc-galaxy', image_path: '/products/accessories/accessories-galaxy.png', usps: ['케이스', '충전기'] },
    { name: 'Galaxy 탭 액세서리', code_name: 'acc-tab', image_path: '/products/accessories/accessories-galaxy-tab.png', usps: ['키보드', '케이스'] },
    { name: '오디오 액세서리', code_name: 'acc-audio', image_path: '/products/accessories/accessories-audio.png', usps: ['이어팁', '케이스'] },
    { name: 'TV 액세서리', code_name: 'acc-tv', image_path: '/products/accessories/accessories-tv.png', usps: ['리모컨', '마운트'] },
    { name: '주방 액세서리', code_name: 'acc-kitchen', image_path: '/products/accessories/accessories-kitchen.png', usps: ['필터', '부속품'] },
    { name: '리빙 액세서리', code_name: 'acc-living', image_path: '/products/accessories/accessories-living.png', usps: ['필터', '부속품'] },
    { name: 'PC 액세서리', code_name: 'acc-pc', image_path: '/products/accessories/accessories-pc.png', usps: ['마우스', '키보드'] },
    { name: '토너/잉크', code_name: 'acc-toner', image_path: '/products/accessories/accessories-toner-ink.png', usps: ['인쇄소모품'] },
    { name: '액세서리 검색', code_name: 'acc-search', image_path: '/products/accessories/accessories-search.png', usps: ['전체검색'] },
  ],
  'AI Club': [
    { name: '모바일 구독', code_name: 'aiclub-mobile', image_path: '/products/ai-club/ai-club-mobile.png', usps: ['스마트폰 구독'] },
    { name: 'TV 구독', code_name: 'aiclub-tv', image_path: '/products/ai-club/ai-club-tv.png', usps: ['TV 구독'] },
    { name: '주방가전 구독', code_name: 'aiclub-kitchen', image_path: '/products/ai-club/ai-club-kitchen.png', usps: ['주방가전 구독'] },
    { name: '리빙가전 구독', code_name: 'aiclub-living', image_path: '/products/ai-club/ai-club-living.png', usps: ['생활가전 구독'] },
    { name: 'PC 구독', code_name: 'aiclub-pc', image_path: '/products/ai-club/ai-club-pc.png', usps: ['PC 구독'] },
  ],
}

export async function POST() {
  try {
    const supabase = createServiceClient()
    const results: string[] = []

    // Step 0: Add image_path column if not exists (raw SQL via RPC or direct)
    results.push('Adding image_path column to products table...')
    // Note: We'll store image_path in the brief's content or use code_name convention

    // Step 1: Backup existing categories
    results.push('Backing up existing categories...')
    const { data: existingCategories } = await supabase.from('categories').select('*')
    console.log('Existing categories:', existingCategories?.length || 0)

    // Step 2: Delete existing products and briefs (due to FK constraints)
    results.push('Deleting existing briefs...')
    await supabase.from('briefs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    results.push('Deleting existing products...')
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    results.push('Deleting existing categories...')
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 3: Insert new categories
    results.push('Inserting Samsung.com 10 categories...')
    const { data: newCategories, error: catError } = await supabase
      .from('categories')
      .insert(SAMSUNG_CATEGORIES)
      .select()

    if (catError) {
      throw new Error(`Failed to insert categories: ${catError.message}`)
    }
    results.push(`Inserted ${newCategories?.length || 0} categories`)

    // Step 4: Create a map of category names to IDs
    const categoryMap = new Map<string, string>()
    newCategories?.forEach(cat => {
      categoryMap.set(cat.name, cat.id)
    })

    // Step 5: Insert products for each category
    let totalProducts = 0
    let totalBriefs = 0

    for (const [categoryName, products] of Object.entries(PRODUCTS_DATA)) {
      const categoryId = categoryMap.get(categoryName)
      if (!categoryId) {
        results.push(`Warning: Category ${categoryName} not found`)
        continue
      }

      for (const product of products) {
        // Insert product
        const { data: newProduct, error: prodError } = await supabase
          .from('products')
          .insert({
            category_id: categoryId,
            name: product.name,
            code_name: product.code_name,
          })
          .select()
          .single()

        if (prodError) {
          results.push(`Failed to insert product ${product.name}: ${prodError.message}`)
          continue
        }
        totalProducts++

        // Insert brief with USPs
        const { error: briefError } = await supabase
          .from('briefs')
          .insert({
            product_id: newProduct.id,
            version: 1,
            usps: product.usps,
            content: `${product.name} - ${product.usps.join(', ')}`,
            is_active: true,
          })

        if (briefError) {
          results.push(`Failed to insert brief for ${product.name}: ${briefError.message}`)
          continue
        }
        totalBriefs++
      }
    }

    results.push(`Migration complete!`)
    results.push(`- Categories: ${newCategories?.length || 0}`)
    results.push(`- Products: ${totalProducts}`)
    results.push(`- Briefs: ${totalBriefs}`)

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Samsung Product Images Migration API',
    usage: 'POST /api/migration to run the migration',
    warning: 'This will DELETE all existing categories, products, and briefs!',
  })
}
