"""The sample data's story, written out (SEED-2 to SEED-5).

A Korean exporter of industrial parts and packaging, with customers at home and
abroad. Every name is made up. Websites and email addresses use the reserved
`.example` domain, so none of them points at a real company.

Dates are days from today: -9 is nine days ago. sample.py turns them into
real dates when it loads the data.
"""

from typing import NamedTuple


class Org(NamedTuple):
    name: str
    industry: str
    website: str
    notes: str | None = None


class Person(NamedTuple):
    org: str | None
    name: str
    job_title: str
    email: str | None
    phone: str | None
    status: str  # lead, qualified or customer. Won deals' contacts are customers.


class Deal(NamedTuple):
    name: str
    org: str | None
    contact: str | None
    stage: str
    value: int
    close: int | None  # days from today
    start: str = "new"  # the stage it was added at
    furthest: str | None = None  # for lost deals: the furthest open stage reached


class FollowUp(NamedTuple):
    on_deal: str | None
    on_contact: str | None
    kind: str
    description: str
    days_ago: int
    follow_up: int | None  # days from today
    done: bool = False


ORGANIZATIONS = [
    Org("한빛정밀", "제조", "hanbit-precision.example", "2019년부터 거래. 포장재와 정밀 부품을 함께 구매하는 핵심 고객."),
    Org("대성기계공업", "제조", "daesung-mech.example", "창원 공장. 연간 단가 계약을 선호함."),
    Org("세원오토텍", "제조", "sewon-autotech.example", "자동차 부품 1차 협력사. 품질 감사가 까다로움."),
    Org("한결테크", "IT", "hangyeol-tech.example", "반도체 장비 유지보수 업체."),
    Org("해담푸드", "식품", "haedam-food.example", "냉동식품 제조. 성수기는 9월부터 12월."),
    Org("루미에르코스메틱", "화장품", "lumiere-cosmetic.example", None),
    Org("메디온헬스케어", "의료기기", "medion-health.example", "멸균 포장 인증 서류가 필요함."),
    Org("우진로지스", "물류", "woojin-logis.example", "이천과 평택에 물류센터 운영."),
    Org("그린팩유통", "유통", "greenpack.example", None),
    Org("바른식품", "식품", "bareun-food.example", "명절 선물세트 물량이 큼."),
    Org("소담화장품", "화장품", "sodam-cosmetics.example", "소규모 브랜드. 대표가 직접 구매 결정."),
    Org("동해물류", "물류", "donghae-logistics.example", None),
    Org("새롬메디칼", "의료기기", "saerom-medical.example", None),
    Org("Osaka Kogyo Co.", "제조", "osaka-kogyo.example", "Japan. Orders in yen-equivalent USD, quarterly."),
    Org("Sakura Precision Co.", "제조", "sakura-precision.example", "Japan. Long-term spare parts partner."),
    Org("Brightwater Foods", "식품", "brightwater-foods.example", "USA. Two plants, Ohio and Oregon."),
    Org("Northwind Market", "유통", "northwind-market.example", "USA. Regional grocery chain."),
    Org("Kessler Verpackung GmbH", "제조", "kessler-verpackung.example", "Germany. Packaging machinery maker."),
    Org("Saigon Fresh Logistics", "물류", "saigon-fresh.example", "Vietnam. Cold chain for exporters."),
    Org("Pacific Harbor Foods", "식품", "pacific-harbor.example", "Australia. Seafood processing."),
    Org("Maison Lys", "화장품", "maison-lys.example", "France. Premium skincare."),
    Org("Hanoi Medical Supply", "의료기기", "hanoi-medsupply.example", "Vietnam. Hospital distributor."),
    Org("Rhein Logistik GmbH", "물류", "rhein-logistik.example", "Germany."),
    Org("Summit Retail Group", "유통", "summit-retail.example", "USA. Private label programs."),
    Org("Tokyo Data Systems", "IT", "tokyo-data.example", "Japan. Data center builder."),
]

CONTACTS = [
    Person("한빛정밀", "박서연", "구매팀장", "seoyeon.park@hanbit-precision.example", "010-2841-7730", "customer"),
    Person("한빛정밀", "김도현", "생산관리 과장", "dohyun.kim@hanbit-precision.example", "031-778-2210", "qualified"),
    Person("한빛정밀", "이지원", "구매 담당", "jiwon.lee@hanbit-precision.example", "010-4410-9921", "lead"),
    Person("대성기계공업", "최준호", "자재팀 부장", "junho.choi@daesung-mech.example", "055-281-4400", "customer"),
    Person("대성기계공업", "정하은", "구매 대리", "haeun.jung@daesung-mech.example", "010-7725-1043", "customer"),
    Person("대성기계공업", "윤성민", "공무팀 과장", "sungmin.yoon@daesung-mech.example", "010-3318-2287", "lead"),
    Person("세원오토텍", "김도윤", "구매본부장", "doyun.kim@sewon-autotech.example", "010-9012-4471", "customer"),
    Person("세원오토텍", "오민지", "협력사관리 대리", "minji.oh@sewon-autotech.example", "031-490-7712", "qualified"),
    Person("세원오토텍", "한승재", "품질팀 과장", "seungjae.han@sewon-autotech.example", "010-6620-3391", "lead"),
    Person("한결테크", "이하린", "구매팀장", "harin.lee@hangyeol-tech.example", "010-5530-8812", "customer"),
    Person("한결테크", "장우석", "설비팀 차장", "wooseok.jang@hangyeol-tech.example", "031-8039-5520", "qualified"),
    Person("한결테크", "서예린", "구매 사원", "yerin.seo@hangyeol-tech.example", "010-2290-6614", "lead"),
    Person("해담푸드", "강지민", "구매팀 과장", "jimin.kang@haedam-food.example", "010-8843-2205", "customer"),
    Person("해담푸드", "정민호", "품질팀 대리", "minho.jung@haedam-food.example", "043-210-7781", "qualified"),
    Person("해담푸드", "임태훈", "생산팀장", "taehoon.lim@haedam-food.example", "010-4471-0098", "lead"),
    Person("루미에르코스메틱", "송유나", "패키지개발 팀장", "yuna.song@lumiere-cosmetic.example", "02-3442-1180", "customer"),
    Person("루미에르코스메틱", "배준영", "구매 대리", "junyoung.bae@lumiere-cosmetic.example", "010-3307-5512", "qualified"),
    Person("루미에르코스메틱", "김서현", "마케팅 과장", "seohyun.kim@lumiere-cosmetic.example", "010-6654-2290", "lead"),
    Person("메디온헬스케어", "신동혁", "구매부장", "donghyuk.shin@medion-health.example", "010-2215-7764", "qualified"),
    Person("메디온헬스케어", "이준표", "생산팀장", "junpyo.lee@medion-health.example", "033-742-1130", "qualified"),
    Person("메디온헬스케어", "권나연", "RA팀 과장", "nayeon.kwon@medion-health.example", "010-9981-3307", "lead"),
    Person("우진로지스", "조현태", "운영팀장", "hyuntae.cho@woojin-logis.example", "010-4120-6638", "customer"),
    Person("우진로지스", "문소희", "구매 대리", "sohee.moon@woojin-logis.example", "031-645-9902", "qualified"),
    Person("우진로지스", "박준기", "IT팀 과장", "junki.park@woojin-logis.example", "010-7734-0215", "lead"),
    Person("그린팩유통", "황민석", "MD 팀장", "minseok.hwang@greenpack.example", "02-6012-4471", "qualified"),
    Person("그린팩유통", "안수빈", "MD", "subin.ahn@greenpack.example", "010-5528-1196", "lead"),
    Person("바른식품", "전재원", "구매팀장", "jaewon.jeon@bareun-food.example", "010-3392-7718", "customer"),
    Person("바른식품", "홍다은", "품질관리 대리", "daeun.hong@bareun-food.example", "041-552-3380", "lead"),
    Person("바른식품", "최유나", "마케팅 대리", "yuna.choi@bareun-food.example", "010-8126-4459", "lead"),
    Person("소담화장품", "유지호", "대표", "jiho.yoo@sodam-cosmetics.example", "010-2047-6631", "customer"),
    Person("소담화장품", "남궁선", "생산 실장", "sun.namgung@sodam-cosmetics.example", "010-9318-2274", "qualified"),
    Person("동해물류", "고은비", "물류센터장", "eunbi.ko@donghae-logistics.example", "033-530-8814", "qualified"),
    Person("동해물류", "노현석", "구매 과장", "hyunseok.noh@donghae-logistics.example", "010-6609-1172", "lead"),
    Person("동해물류", "김태은", "운영 대리", "taeeun.kim@donghae-logistics.example", "010-1148-3306", "lead"),
    Person("새롬메디칼", "류정민", "구매팀장", "jungmin.ryu@saerom-medical.example", "010-7203-5548", "lead"),
    Person("새롬메디칼", "백승희", "영업기획 대리", "seunghee.baek@saerom-medical.example", "02-415-6627", "lead"),
    Person("Osaka Kogyo Co.", "Kenji Watanabe", "Purchasing Manager", "k.watanabe@osaka-kogyo.example", "+81 6-6345-2210", "customer"),
    Person("Osaka Kogyo Co.", "Yuki Tanaka", "Production Engineer", "y.tanaka@osaka-kogyo.example", "+81 6-6345-2234", "qualified"),
    Person("Osaka Kogyo Co.", "Hiroshi Mori", "Plant Manager", "h.mori@osaka-kogyo.example", "+81 6-6345-2201", "lead"),
    Person("Sakura Precision Co.", "Aiko Suzuki", "Procurement Lead", "aiko.suzuki@sakura-precision.example", "+81 52-551-7810", "customer"),
    Person("Sakura Precision Co.", "Takeshi Ito", "Quality Manager", "t.ito@sakura-precision.example", "+81 52-551-7822", "lead"),
    Person("Brightwater Foods", "Michael Turner", "Operations Director", "mturner@brightwater-foods.example", "+1 614-555-0142", "customer"),
    Person("Brightwater Foods", "Jessica Moore", "Buyer", "jmoore@brightwater-foods.example", "+1 614-555-0177", "customer"),
    Person("Brightwater Foods", "Daniel Brooks", "Warehouse Manager", "dbrooks@brightwater-foods.example", "+1 503-555-0119", "lead"),
    Person("Northwind Market", "Sarah Kim", "Category Manager", "sarah.kim@northwind-market.example", "+1 206-555-0163", "customer"),
    Person("Northwind Market", "Ryan Cooper", "Store Development Lead", "ryan.cooper@northwind-market.example", "+1 206-555-0188", "lead"),
    Person("Kessler Verpackung GmbH", "Lukas Becker", "Head of Purchasing", "l.becker@kessler-verpackung.example", "+49 711 555 3120", "customer"),
    Person("Kessler Verpackung GmbH", "Anna Schmidt", "Project Engineer", "a.schmidt@kessler-verpackung.example", "+49 711 555 3147", "qualified"),
    Person("Saigon Fresh Logistics", "Nguyen Thi Mai", "Supply Chain Manager", "mai.nguyen@saigon-fresh.example", "+84 28 5555 0181", "customer"),
    Person("Saigon Fresh Logistics", "Tran Van Duc", "Operations Lead", "duc.tran@saigon-fresh.example", "+84 28 5555 0194", "qualified"),
    Person("Pacific Harbor Foods", "Emma Clarke", "Procurement Manager", "emma.clarke@pacific-harbor.example", "+61 2 5550 1182", "qualified"),
    Person("Pacific Harbor Foods", "Liam Walker", "Packaging Engineer", "liam.walker@pacific-harbor.example", "+61 2 5550 1190", "lead"),
    Person("Maison Lys", "Claire Dubois", "Packaging Director", "c.dubois@maison-lys.example", "+33 1 55 55 21 40", "qualified"),
    Person("Maison Lys", "Julien Martin", "Buyer", "j.martin@maison-lys.example", "+33 1 55 55 21 52", "lead"),
    Person("Hanoi Medical Supply", "Pham Minh Anh", "Purchasing Head", "anh.pham@hanoi-medsupply.example", "+84 24 5555 0123", "lead"),
    Person("Hanoi Medical Supply", "Le Quang Huy", "Regulatory Lead", "huy.le@hanoi-medsupply.example", "+84 24 5555 0156", "lead"),
    Person("Rhein Logistik GmbH", "Jonas Weber", "Fleet Manager", "j.weber@rhein-logistik.example", "+49 221 555 7710", "qualified"),
    Person("Rhein Logistik GmbH", "Mia Fischer", "Buyer", "m.fischer@rhein-logistik.example", "+49 221 555 7733", "lead"),
    Person("Summit Retail Group", "Olivia Bennett", "Private Label Manager", "o.bennett@summit-retail.example", "+1 312-555-0105", "customer"),
    Person("Summit Retail Group", "Ethan Hayes", "Buyer", "e.hayes@summit-retail.example", "+1 312-555-0131", "qualified"),
    Person("Tokyo Data Systems", "Haruto Kobayashi", "IT Manager", "h.kobayashi@tokyo-data.example", "+81 3-5555-8120", "qualified"),
    Person("Tokyo Data Systems", "Mei Yamamoto", "Procurement", "m.yamamoto@tokyo-data.example", "+81 3-5555-8144", "lead"),
    Person(None, "김지후", "프리랜서 바이어", "jihu.kim@mail.example", "010-3381-2209", "lead"),
    Person(None, "이서윤", "수입 대행", None, "010-5172-8840", "lead"),
    Person(None, "박민재", "포장 컨설턴트", "minjae.park@mail.example", None, "qualified"),
    Person(None, "장민서", "온라인 셀러", "minseo.jang@mail.example", "010-9926-4410", "lead"),
    Person(None, "송하린", "창업 준비", None, "010-2208-7713", "lead"),
    Person(None, "Chris Lee", "Sourcing Consultant", "chris.lee@mail.example", "+1 415-555-0170", "lead"),
    Person(None, "Hannah Park", "Importer", "hannah.park@mail.example", "+1 213-555-0126", "qualified"),
    Person(None, "David Kim", "Trade Agent", "david.kim@mail.example", None, "lead"),
]

DEALS = [
    # New
    Deal("동남아 콜드체인 포장 시범 공급", "Saigon Fresh Logistics", "Tran Van Duc", "new", 38000, 89),
    Deal("화장품 용기 2차 금형", "루미에르코스메틱", "배준영", "new", 24500, 53),
    Deal("Warehouse sensor pilot", "Brightwater Foods", "Daniel Brooks", "new", 52000, 107),
    Deal("정밀 베어링 연간 단가 계약", "대성기계공업", "윤성민", "new", 67000, 74),
    Deal("Label printer retrofit", "Kessler Verpackung GmbH", "Anna Schmidt", "new", 18500, 68),
    Deal("멸균 트레이 신규 규격", "새롬메디칼", "류정민", "new", 15000, None),
    Deal("Fleet pallet tracking tags", "Rhein Logistik GmbH", None, "new", 9500, 120),
    Deal("물류 박스 표준화", "동해물류", "노현석", "new", 21000, 60),
    Deal("수출용 완충재 견적 문의", None, "김지후", "new", 6500, None),
    # Qualified
    Deal("냉동식품 트레이 공급", "해담푸드", "강지민", "qualified", 45000, 25),
    Deal("Line 2 conveyor parts", "Osaka Kogyo Co.", "Yuki Tanaka", "qualified", 83000, 50),
    Deal("의료기기 멸균 파우치", "메디온헬스케어", "신동혁", "qualified", 29000, -9),
    Deal("Retail display packaging", "Northwind Market", "Ryan Cooper", "qualified", 36000, 60),
    Deal("소형 가전 포장 리뉴얼", "그린팩유통", "안수빈", "qualified", 27000, 45),
    Deal("Medical cart casters", "Hanoi Medical Supply", "Pham Minh Anh", "qualified", 33500, 70, start="qualified"),
    Deal("서버랙 부품 공급", "한결테크", "장우석", "qualified", 58000, 38),
    Deal("Store fixture hardware", "Summit Retail Group", "Ethan Hayes", "qualified", 41000, 82),
    Deal("친환경 포장 샘플 제작", None, None, "qualified", 4800, 30),
    # Proposal
    Deal("2027 포장재 공급", "한빛정밀", "박서연", "proposal", 120000, 37),
    Deal("Spare parts framework", "Sakura Precision Co.", "Aiko Suzuki", "proposal", 96500, 19),
    Deal("물류센터 자동화 부품", "우진로지스", "문소희", "proposal", 74000, -18),
    Deal("Cosmetic tube supply", "Maison Lys", "Claire Dubois", "proposal", 41000, 46),
    Deal("프리미엄 선물세트 패키지", "바른식품", "전재원", "proposal", 52000, 29, start="qualified"),
    Deal("Cold room shelving", "Pacific Harbor Foods", "Liam Walker", "proposal", 28500, 33),
    Deal("진단키트 케이스 사출", "메디온헬스케어", "이준표", "proposal", 63000, 52),
    Deal("Data center cable trays", "Tokyo Data Systems", "Haruto Kobayashi", "proposal", 47000, 41),
    Deal("화장품 리필 파우치", "소담화장품", "남궁선", "proposal", 19500, 24),
    # Negotiation
    Deal("자동차 부품 3년 공급", "세원오토텍", "김도윤", "negotiation", 248000, 12),
    Deal("Food-grade film contract", "Pacific Harbor Foods", "Emma Clarke", "negotiation", 132000, 27),
    Deal("Packaging line upgrade", "Kessler Verpackung GmbH", "Lukas Becker", "negotiation", 45000, -3),
    Deal("반도체 장비 소모품 연간 계약", "한결테크", "이하린", "negotiation", 87000, 18),
    Deal("Private label jars", "Summit Retail Group", "Olivia Bennett", "negotiation", 69000, 22),
    Deal("냉장 물류 박스 2차", "우진로지스", "조현태", "negotiation", 38000, -12),
    Deal("Conveyor belt modules", "Osaka Kogyo Co.", "Kenji Watanabe", "negotiation", 112000, 35),
    Deal("식품 포장 필름 단가 갱신", "해담푸드", "정민호", "negotiation", 26000, 8, start="proposal"),
    # Won, newest first. One closes today, so this month is never empty.
    Deal("반도체 장비 부품 납품", "한결테크", "이하린", "won", 54000, 0),
    Deal("Bottle cap order Q1", "Brightwater Foods", "Michael Turner", "won", 23000, -6, start="proposal"),
    Deal("산업용 필터 교체", "대성기계공업", "최준호", "won", 15000, -13, start="qualified"),
    Deal("Gasket supply renewal", "Osaka Kogyo Co.", "Kenji Watanabe", "won", 31000, -21, start="proposal"),
    Deal("화장품 용기 1차 금형", "루미에르코스메틱", "송유나", "won", 42000, -34),
    Deal("Shrink sleeve labels", "Northwind Market", "Sarah Kim", "won", 18000, -41, start="proposal"),
    Deal("정밀 샤프트 가공", "한빛정밀", "박서연", "won", 76000, -50),
    Deal("Reefer container liners", "Saigon Fresh Logistics", "Nguyen Thi Mai", "won", 36500, -62),
    Deal("냉동 트레이 1차 공급", "해담푸드", "강지민", "won", 28000, -70, start="qualified"),
    Deal("Automation spare kit", "Kessler Verpackung GmbH", "Lukas Becker", "won", 64000, -79),
    Deal("물류 팔레트 랩", "우진로지스", "조현태", "won", 12500, -91, start="proposal"),
    Deal("Precision pins batch", "Sakura Precision Co.", "Aiko Suzuki", "won", 22000, -99, start="proposal"),
    Deal("자동차 시트 브래킷", "세원오토텍", "김도윤", "won", 98000, -108),
    Deal("Snack tray pilot", "Brightwater Foods", "Michael Turner", "won", 9500, -120, start="qualified"),
    Deal("앰플 케이스 공급", "소담화장품", "유지호", "won", 16500, -129, start="proposal"),
    Deal("프레스 금형 부품", "대성기계공업", "최준호", "won", 47000, -140),
    Deal("Private label caps", "Summit Retail Group", "Olivia Bennett", "won", 33000, -151),
    Deal("반도체 클린룸 소모품", "한결테크", "이하린", "won", 58500, -160, start="proposal"),
    Deal("명절 선물세트 포장", "바른식품", "전재원", "won", 39000, -172),
    Deal("Cold chain boxes", "Saigon Fresh Logistics", "Nguyen Thi Mai", "won", 27500, -183, start="proposal"),
    Deal("포장재 연간 공급 2026", "한빛정밀", "박서연", "won", 115000, -195),
    Deal("Display hooks", "Northwind Market", "Sarah Kim", "won", 8500, -206, start="proposal"),
    Deal("화장품 펌프 디스펜서", "루미에르코스메틱", "송유나", "won", 25000, -218),
    Deal("Conveyor rollers", "Osaka Kogyo Co.", "Kenji Watanabe", "won", 52000, -230),
    Deal("자동차 부품 포장 개선", "세원오토텍", "김도윤", "won", 71000, -244),
    Deal("Cushioning foam", "Kessler Verpackung GmbH", "Lukas Becker", "won", 14000, -259, start="proposal"),
    Deal("냉장 배송 박스", "우진로지스", "조현태", "won", 19000, -275),
    Deal("식품 진공 포장재", "해담푸드", "강지민", "won", 23500, -292),
    Deal("Bearing housings", "Sakura Precision Co.", "Aiko Suzuki", "won", 44000, -315),
    Deal("기프트 박스 시범", "소담화장품", "유지호", "won", 7000, -340, start="qualified"),
    # Lost, newest first
    Deal("친환경 완충재 입찰", "그린팩유통", "황민석", "lost", 58000, -9, furthest="proposal"),
    Deal("Display stand project", "Northwind Market", "Ryan Cooper", "lost", 12000, -25, furthest="qualified"),
    Deal("의료용 트레이 시제품", "새롬메디칼", "백승희", "lost", 8000, -44, furthest="new"),
    Deal("Pallet wrap tender", "Rhein Logistik GmbH", "Jonas Weber", "lost", 26000, -67, furthest="negotiation"),
    Deal("화장품 쇼핑백", "소담화장품", "남궁선", "lost", 5500, -88, furthest="qualified"),
    Deal("Sensor housing RFQ", "Tokyo Data Systems", "Mei Yamamoto", "lost", 31000, -111, furthest="proposal"),
    Deal("대형마트 진열대", "그린팩유통", "안수빈", "lost", 44000, -135, furthest="proposal"),
    Deal("Retort pouch trial", "Pacific Harbor Foods", "Emma Clarke", "lost", 17500, -158, furthest="qualified"),
    Deal("공장 자동화 컨베이어", "대성기계공업", "윤성민", "lost", 132000, -180, furthest="negotiation"),
    Deal("Cosmetic jar tender", "Maison Lys", "Julien Martin", "lost", 22000, -203, furthest="proposal"),
    Deal("수출 포장 컨설팅", None, "박민재", "lost", 3000, -226, furthest="new"),
    Deal("Medical pouch tender", "Hanoi Medical Supply", "Le Quang Huy", "lost", 39000, -252, furthest="proposal"),
    Deal("냉동 창고 랙", "동해물류", "고은비", "lost", 61000, -280, furthest="qualified"),
    Deal("Store signage kit", "Summit Retail Group", "Ethan Hayes", "lost", 9000, -308, furthest="new"),
    Deal("배터리 부품 케이스", "세원오토텍", "오민지", "lost", 85000, -345, furthest="negotiation"),
]

# Activities with follow-ups, written out so the dashboard always has three
# overdue, one due today, six in the next two weeks and four later.
FOLLOW_UPS = [
    FollowUp("물류센터 자동화 부품", None, "call", "견적서 수정본 회신 확인", 12, -5),
    FollowUp(None, "Emma Clarke", "call", "Call back about sample results", 10, -3),
    FollowUp("의료기기 멸균 파우치", None, "email", "멸균 파우치 샘플 발송 일정 확인", 9, -2),
    FollowUp("자동차 부품 3년 공급", None, "note", "계약서 초안 법무 검토 요청", 4, 0),
    FollowUp(None, "Kenji Watanabe", "email", "Send revised price list", 3, 2),
    FollowUp(None, "박서연", "call", "공장 방문 미팅 준비", 2, 4),
    FollowUp("반도체 장비 소모품 연간 계약", None, "call", "단가 협상안 회신 받기", 1, 6),
    FollowUp("동남아 콜드체인 포장 시범 공급", None, "email", "Follow up on trial order", 6, 9),
    FollowUp(None, "Claire Dubois", "email", "Share tube decoration samples", 5, 11),
    FollowUp("프리미엄 선물세트 패키지", None, "note", "샘플 디자인 시안 전달", 2, 13),
    FollowUp("정밀 베어링 연간 단가 계약", None, "note", "연간 물량 확정 후 재견적", 7, 21),
    FollowUp(None, "Jonas Weber", "call", "Check budget for next year", 8, 30),
    FollowUp("Data center cable trays", None, "email", "Confirm installation schedule", 4, 38),
    FollowUp(None, "고은비", "call", "신규 물류센터 오픈 일정 확인", 15, 47),
    FollowUp("2027 포장재 공급", None, "email", "2027년 물량 계획서 받음, 다음 주 제안서 준비", 10, -3, done=True),
    FollowUp(None, "Nguyen Thi Mai", "call", "Trial order of 2,000 trays confirmed for December", 7, -1, done=True),
    FollowUp("Packaging line upgrade", None, "email", "Asked for delivery in two batches, January and March", 3, None),
    FollowUp("친환경 완충재 입찰", None, "note", "실주 사유: 경쟁사와 단가 8% 차이", 8, None),
    FollowUp(None, "김도윤", "call", "납기 일정 확정, 계약서 초안은 이번 주에 보내기로 함", 0, None),
]

# Notes, calls and emails without follow-ups, placed on records at random with
# a fixed seed. Korean records get Korean text and overseas ones English.
TEMPLATES_KO = [
    ("call", "담당자와 통화, 다음 분기 물량 계획 공유받음"),
    ("call", "납기 일정 확인, 일주일 앞당길 수 있는지 문의함"),
    ("email", "견적서 송부, 단가 유효기간은 30일"),
    ("email", "샘플 테스트 결과 받음, 내구성 기준 통과"),
    ("note", "경쟁사 대비 단가 5% 높음, 품질로 설득 필요"),
    ("note", "공장 방문, 생산 라인 확인하고 포장 규격 측정"),
    ("call", "결제 조건 협의, 60일 결제 요청"),
    ("email", "사양서 수정본 받음, 두께 0.2mm 변경"),
    ("note", "구매팀 담당자 변경, 새 담당자에게 인수인계 요청"),
    ("call", "시제품 일정 확인, 다음 달 초 납품 예정"),
]

TEMPLATES_EN = [
    ("call", "Discussed volumes for next quarter, expecting a 10% increase"),
    ("email", "Sent quotation, prices valid for 30 days"),
    ("email", "Received sample test results, all within tolerance"),
    ("note", "They are comparing us with a local supplier on price"),
    ("call", "Confirmed shipping terms, FOB Busan"),
    ("email", "Asked for a revised spec sheet with metric sizes"),
    ("note", "Met at the trade show, interested in recycled materials"),
    ("call", "Checked delivery schedule, first batch in three weeks"),
    ("email", "Sent certificate of origin and test reports"),
    ("note", "New buyer joined their team, intro call booked"),
]

RANDOM_ACTIVITIES = 36
RANDOM_SEED = 20261123
