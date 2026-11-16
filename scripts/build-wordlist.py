#!/usr/bin/env python3
"""生成 public/pet-words.csv：按 12 周计划的主题编排的 B1 词表。
每行：word|pos|中文释义|例句|need_spelling。改完后运行 python3 scripts/build-wordlist.py。"""
import csv, re, sys

WEEKS = [
("daily life & school", """
timetable|n|时间表；课程表|Check the timetable to see when maths starts.|0
uniform|n|校服；制服|We wear a blue uniform at my school.|1
subject|n|科目|Science is my favourite subject.|1
break|n|课间休息|We play football during the morning break.|0
homework|n|家庭作业|I do my homework before dinner.|1
classmate|n|同班同学|My classmate lent me her pencil.|0
explain|v|解释|Can you explain this word to me?|1
borrow|v|借（入）|May I borrow your ruler for a minute?|0
library|n|图书馆|I get new books from the library every week.|1
practise|v|练习|I practise the piano every evening.|0
neighbour|n|邻居|Our neighbour has a friendly dog.|0
tidy|v|整理；收拾|I tidy my bedroom on Saturdays.|0
usually|adv|通常|I usually get up at seven o'clock.|1
breakfast|n|早餐|I had eggs and toast for breakfast.|1
routine|n|日常惯例|Brushing my teeth is part of my bedtime routine.|0
relax|v|放松|I relax by reading comics after school.|0
weekend|n|周末|We visit my grandparents every weekend.|1
prepare|v|准备|Dad helps me prepare my school bag.|0
favourite|adj|最喜欢的|Blue is my favourite colour.|1
comfortable|adj|舒服的|This sofa is very comfortable.|0
lesson|n|一节课|Our first lesson today is English.|1
pupil|n|小学生；学生|There are thirty pupils in my class.|0
classroom|n|教室|Our classroom is on the second floor.|1
dictionary|n|词典|Look up the new word in your dictionary.|0
exam|n|考试|I felt ready for the maths exam.|0
term|n|学期|The summer term ends in July.|0
project|n|课题；项目|We are doing a project about the sea.|0
remember|v|记得|I always remember my best friend's birthday.|1
forget|v|忘记|Don't forget your lunch box!|1
wake|v|醒来|I wake up when the sun comes in.|0
shower|n|淋浴|I have a shower every morning.|0
early|adv|早|We got to school early today.|1
busy|adj|忙的|Mum is busy in the kitchen.|1
diary|n|日记|I write in my diary before bed.|0
housework|n|家务|I help with the housework on Sundays.|0
discuss|v|讨论|We discuss the story in small groups.|0
"""),
("food & shopping", """
recipe|n|食谱|This is my grandma's recipe for soup.|0
ingredient|n|（烹饪的）原料|Eggs are the main ingredient in this cake.|0
delicious|adj|美味的|The noodles were delicious.|1
fresh|adj|新鲜的|We bought fresh bread this morning.|1
spicy|adj|辣的|This curry is too spicy for me.|0
salty|adj|咸的|The chips are very salty.|0
fry|v|煎；炸|Dad likes to fry eggs for breakfast.|0
boil|v|煮；烧开|Boil the water before you add the pasta.|0
bake|v|烤（面包、蛋糕）|We bake biscuits at the weekend.|0
slice|n|一片|Would you like a slice of pizza?|0
bowl|n|碗|I ate a bowl of rice.|0
plate|n|盘子|Put the sandwiches on a plate.|0
fork|n|叉子|I need a fork for my salad.|0
dish|n|一道菜|My favourite dish is fried rice.|0
snack|n|零食；小吃|I have a snack after school.|0
dessert|n|甜点|We had ice cream for dessert.|0
vegetable|n|蔬菜|Carrots are my favourite vegetable.|1
flour|n|面粉|You need flour to make bread.|0
honey|n|蜂蜜|I put honey on my toast.|0
thirsty|adj|口渴的|I was thirsty after the race.|1
hungry|adj|饿的|I'm always hungry at four o'clock.|1
menu|n|菜单|The waiter gave us the menu.|0
order|v|点（菜）；订购|I'd like to order a cheese sandwich.|1
bill|n|账单|Dad asked the waiter for the bill.|0
customer|n|顾客|The shop was full of customers.|0
price|n|价格|What is the price of this T-shirt?|1
cheap|adj|便宜的|These pens are really cheap.|1
expensive|adj|贵的|That bike is too expensive.|1
receipt|n|收据；小票|Keep the receipt in your bag.|0
cash|n|现金|Mum paid in cash.|0
spend|v|花（钱、时间）|I spend my pocket money on books.|1
save|v|存（钱）；节省|I want to save money for a new game.|1
pay|v|付钱|You can pay at the desk over there.|1
cost|v|价钱是|How much does this hat cost?|1
choose|v|选择|You can choose any cake you like.|1
queue|n|队；排队的人|There was a long queue at the bakery.|0
"""),
("sports & hobbies", """
team|n|队；团队|Our team plays every Saturday.|1
match|n|比赛|We watched a football match on TV.|1
coach|n|教练|The coach showed us a new trick.|0
player|n|运动员；选手|She is the best player in the school.|1
score|v|得分|I hope to score a point today.|0
goal|n|进球；球门|He kicked the ball into the goal.|0
win|v|赢|I hope we win the game tomorrow.|1
lose|v|输；丢失|It's OK to lose sometimes.|1
race|n|赛跑；比赛|I came second in the race.|0
prize|n|奖品|The first prize is a new bike.|0
competition|n|比赛；竞赛|I entered a drawing competition.|0
champion|n|冠军|She became the school chess champion.|0
training|n|训练|We have swimming training on Tuesdays.|0
exercise|n|锻炼；练习|Walking is good exercise.|1
stadium|n|体育场|The stadium was full of fans.|0
court|n|（网球、篮球）场|We met at the tennis court.|0
racket|n|球拍|I need a new badminton racket.|0
helmet|n|头盔|Always wear a helmet on your bike.|0
cycling|n|骑自行车|We go cycling in the park.|0
climbing|n|攀岩；登山|I tried climbing on holiday.|0
skating|n|滑冰|We went skating on the frozen lake.|0
fishing|n|钓鱼|Grandpa takes me fishing in summer.|0
painting|n|绘画；画作|I did a painting of our garden.|0
drawing|n|素描；画画|She is very good at drawing.|1
collect|v|收集|I collect stickers from different countries.|1
instrument|n|乐器|Which instrument do you play?|0
chess|n|国际象棋|My brother taught me to play chess.|0
puzzle|n|拼图；谜题|We finished the puzzle in an hour.|0
hobby|n|爱好|My hobby is making models.|1
member|n|成员|I'm a member of the art club.|0
join|v|加入|Would you like to join our club?|1
enjoy|v|喜欢；享受|I enjoy playing board games.|1
prefer|v|更喜欢|I prefer tennis to football.|1
throw|v|扔；投|Throw the ball to me!|0
catch|v|接住；抓住|Can you catch this ball?|0
skill|n|技能|Swimming is a useful skill.|0
"""),
("travel & transport", """
abroad|adv|在国外|My cousin studies abroad.|0
airport|n|机场|We took a taxi to the airport.|1
passenger|n|乘客|Every passenger needs a ticket.|0
platform|n|站台|The train leaves from platform two.|0
ticket|n|票|I bought a ticket for the bus.|1
luggage|n|行李|We put our luggage in the car.|0
suitcase|n|手提箱|My suitcase is full of clothes.|0
passport|n|护照|Don't lose your passport!|0
journey|n|旅程|The journey took three hours.|1
trip|n|（短途）旅行|We went on a school trip to the zoo.|1
flight|n|航班；飞行|Our flight was at six in the morning.|0
ferry|n|渡船|We took the ferry to the island.|0
tram|n|有轨电车|You can go by tram to the centre.|0
underground|n|地铁|We travelled by underground in the city.|0
station|n|车站|Meet me at the station at ten.|1
traffic|n|交通；车流|There is a lot of traffic in the morning.|1
map|n|地图|Let's look at the map.|0
guide|n|导游；指南|Our guide told us about the castle.|0
tourist|n|游客|The city is full of tourists in summer.|1
hotel|n|旅馆；酒店|Our hotel was near the beach.|1
reserve|v|预订|Dad will reserve a table for dinner.|0
arrive|v|到达|We will arrive at about noon.|1
leave|v|离开；出发|We leave for the airport at eight.|1
delay|n|延误|There was a short delay at the station.|0
miss|v|错过；想念|Hurry up or we will miss the bus!|1
return|v|返回|We return home on Sunday.|0
direction|n|方向|Which direction is the museum?|0
straight|adv|笔直地|Go straight on and then turn left.|1
corner|n|拐角|The shop is on the corner.|0
bridge|n|桥|We walked across the bridge.|0
harbour|n|港口|There were lots of boats in the harbour.|0
island|n|岛|We stayed on a small island.|0
souvenir|n|纪念品|I bought a souvenir for my friend.|0
postcard|n|明信片|I sent a postcard to my grandma.|0
explore|v|探索|We want to explore the old town.|0
foreign|adj|外国的|I'd like to learn a foreign language.|0
"""),
("nature, weather & animals", """
weather|n|天气|The weather is lovely today.|1
forecast|n|天气预报|The forecast says it will rain.|0
storm|n|暴风雨|We stayed inside during the storm.|0
thunder|n|雷声|The dog is scared of thunder.|0
lightning|n|闪电|We saw lightning over the hills.|0
fog|n|雾|We couldn't see the road in the fog.|0
breeze|n|微风|A cool breeze came from the sea.|0
temperature|n|温度|The temperature fell at night.|0
degree|n|度|It is twenty degrees today.|0
freezing|adj|极冷的|It's freezing outside, so wear a coat.|0
mild|adj|温和的|The winter here is quite mild.|0
sunshine|n|阳光|We sat in the sunshine.|0
cloudy|adj|多云的|It was cloudy all morning.|1
forest|n|森林|We walked through the forest.|1
mountain|n|山|We climbed a high mountain.|1
valley|n|山谷|A river runs through the valley.|0
stream|n|小溪|We jumped over a little stream.|0
lake|n|湖|You can swim in the lake.|1
coast|n|海岸|They live on the coast.|0
cliff|n|悬崖|Don't stand near the edge of the cliff.|0
desert|n|沙漠|It hardly ever rains in the desert.|0
field|n|田地；场地|The cows are in the field.|0
wildlife|n|野生动物|The park is full of wildlife.|0
insect|n|昆虫|An ant is a small insect.|0
butterfly|n|蝴蝶|A butterfly landed on the flower.|0
whale|n|鲸|We saw a whale from the boat.|0
dolphin|n|海豚|A dolphin jumped out of the water.|0
eagle|n|鹰|An eagle flew above us.|0
feather|n|羽毛|I found a white feather.|0
tail|n|尾巴|The cat has a long tail.|0
nest|n|鸟巢|There is a nest in our tree.|0
protect|v|保护|We must protect the forests.|1
environment|n|环境|Plastic is bad for the environment.|1
pollution|n|污染|Cars cause a lot of pollution.|0
recycle|v|回收利用|We recycle paper and glass at home.|0
rubbish|n|垃圾|Please put your rubbish in the bin.|0
"""),
("entertainment & media", """
film|n|电影|We watched a film about space.|1
cartoon|n|动画片|My little sister loves this cartoon.|1
comedy|n|喜剧|The comedy made everyone laugh.|0
series|n|系列节目；连续剧|I'm watching a new series about animals.|0
episode|n|（一）集|I saw the first episode last night.|0
channel|n|频道|Which channel is the match on?|0
programme|n|（电视）节目|This programme is about dinosaurs.|1
screen|n|屏幕|The cinema has a huge screen.|0
actor|n|演员|My favourite actor is in this film.|0
director|n|导演|The director made three films last year.|0
character|n|角色；人物|Who is your favourite character in the story?|1
stage|n|舞台|The children sang on the stage.|0
theatre|n|剧院|We saw a play at the theatre.|0
cinema|n|电影院|Let's go to the cinema on Friday.|1
concert|n|音乐会；演唱会|We went to a concert in the park.|1
band|n|乐队|My uncle plays in a band.|0
singer|n|歌手|She is a famous singer.|0
audience|n|观众|The audience clapped loudly.|0
perform|v|表演|We will perform a play at school.|0
review|n|评论；影评|I read a good review of the film.|0
magazine|n|杂志|I buy a science magazine every month.|0
newspaper|n|报纸|Grandpa reads the newspaper every day.|0
article|n|文章|I wrote an article for the school magazine.|1
advert|n|广告|I saw an advert for a new game.|0
interview|n|采访；面试|There was an interview with the winner.|0
journalist|n|记者|The journalist asked a lot of questions.|0
photograph|n|照片|I took a photograph of the sunset.|0
camera|n|相机|I got a camera for my birthday.|1
record|v|录制|We record our songs on a phone.|0
website|n|网站|The school website has all the dates.|0
download|v|下载|You can download the song for free.|0
famous|adj|著名的|The city is famous for its bridges.|1
popular|adj|受欢迎的|Football is popular all over the world.|1
boring|adj|无聊的|The second half of the film was boring.|1
exciting|adj|令人兴奋的|It was an exciting end to the story.|1
exhibition|n|展览|We visited an exhibition of old toys.|0
"""),
("health, body & feelings", """
healthy|adj|健康的|Fruit is a healthy snack.|1
ill|adj|生病的|I was ill and stayed in bed.|1
headache|n|头痛|I have a headache after the long drive.|0
stomach|n|胃；肚子|My stomach hurts a little.|0
throat|n|喉咙|I have a sore throat.|0
cough|n|咳嗽|This medicine is good for a cough.|0
fever|n|发烧|She has a fever and feels hot.|0
pain|n|疼痛|I felt a pain in my foot.|0
hurt|v|疼；弄伤|My legs hurt after the long walk.|1
injury|n|伤；受伤|He missed the game because of an injury.|0
medicine|n|药|Take this medicine twice a day.|1
chemist|n|药剂师；药店|We bought some cream at the chemist.|0
dentist|n|牙医|I go to the dentist twice a year.|0
nurse|n|护士|The nurse was very kind to me.|0
patient|n|病人|The doctor saw ten patients today.|0
hospital|n|医院|My aunt works in a hospital.|1
appointment|n|预约|I have an appointment with the doctor.|0
ambulance|n|救护车|An ambulance arrived in five minutes.|0
accident|n|事故；意外|He had an accident on his bike.|1
shoulder|n|肩膀|The bird sat on my shoulder.|0
elbow|n|手肘|I hit my elbow on the door.|0
knee|n|膝盖|I fell and cut my knee.|0
ankle|n|脚踝|She hurt her ankle playing tennis.|0
brain|n|大脑|Sleep is good for your brain.|0
heart|n|心脏；心|Running makes your heart beat faster.|0
skin|n|皮肤|Sun cream protects your skin.|0
rest|v|休息|You should rest for a few days.|0
diet|n|日常饮食|A good diet has lots of vegetables.|0
worried|adj|担心的|I was worried about the test.|1
nervous|adj|紧张的|I feel nervous before a show.|1
proud|adj|自豪的|Mum was proud of my picture.|1
embarrassed|adj|尴尬的|I felt embarrassed when I fell over.|0
lonely|adj|孤独的|She felt lonely at her new school.|0
upset|adj|难过的|He was upset when his team lost.|0
surprised|adj|惊讶的|I was surprised to see my cousin.|1
calm|adj|平静的|Try to stay calm and breathe slowly.|0
"""),
("work & technology", """
job|n|工作|My mum loves her job.|1
career|n|职业；事业|She wants a career in music.|0
engineer|n|工程师|An engineer fixed the bridge.|0
scientist|n|科学家|The scientist studies the stars.|0
pilot|n|飞行员|The pilot said hello to the passengers.|0
chef|n|厨师|The chef cooked a special meal.|0
farmer|n|农民|The farmer gets up very early.|0
architect|n|建筑师|An architect drew the plans for our school.|0
mechanic|n|修理工；机修工|The mechanic repaired our car.|0
firefighter|n|消防员|A firefighter came to talk to our class.|0
manager|n|经理|The manager of the shop helped us.|0
staff|n|全体员工|The staff at the hotel were friendly.|0
office|n|办公室|Dad works in an office.|1
factory|n|工厂|This factory makes toys.|0
company|n|公司|My aunt works for a big company.|1
meeting|n|会议|Mum has a meeting this afternoon.|1
earn|v|挣（钱）|I earn pocket money by helping at home.|0
salary|n|工资|He gets a good salary.|0
apply|v|申请|My sister wants to apply for a summer job.|0
experience|n|经验；经历|It was a great experience for me.|1
laptop|n|笔记本电脑|I do my homework on a laptop.|0
keyboard|n|键盘|The keyboard has a broken key.|0
printer|n|打印机|The printer has no paper.|0
software|n|软件|We use special software to draw.|0
password|n|密码|Never tell anyone your password.|0
internet|n|互联网|I found the answer on the internet.|1
email|n|电子邮件|I sent an email to my teacher.|1
message|n|消息；留言|She left me a message.|1
robot|n|机器人|The robot can clean the floor.|0
machine|n|机器|This machine makes orange juice.|1
invent|v|发明|I want to invent a flying car.|0
digital|adj|数字的；数码的|I have a digital watch.|0
battery|n|电池|My phone needs a new battery.|0
charge|v|充电|I need to charge my tablet.|0
switch|v|开关；切换|Please switch off the lights.|0
connect|v|连接|You can connect the tablet to the TV.|0
"""),
("home & town", """
flat|n|公寓|We live in a flat on the third floor.|1
balcony|n|阳台|We grow flowers on the balcony.|0
stairs|n|楼梯|I ran up the stairs.|0
roof|n|屋顶|A bird is sitting on the roof.|0
ceiling|n|天花板|There is a spider on the ceiling.|0
furniture|n|家具|We bought new furniture for my room.|0
cupboard|n|柜子；橱柜|The cups are in the cupboard.|0
shelf|n|架子|Put the book back on the shelf.|0
blanket|n|毯子|I sleep under a warm blanket.|0
pillow|n|枕头|My pillow is very soft.|0
curtain|n|窗帘|Close the curtain, please.|0
mirror|n|镜子|I looked at myself in the mirror.|0
fridge|n|冰箱|The milk is in the fridge.|0
cooker|n|炉灶|Be careful, the cooker is hot.|0
neighbourhood|n|街区；邻里|Our neighbourhood is quiet and green.|0
square|n|广场|There is a market in the square.|0
pavement|n|人行道|Please walk on the pavement.|0
castle|n|城堡|We visited an old castle.|0
building|n|建筑物|That tall building is a hospital.|1
entrance|n|入口|I'll wait for you at the entrance.|0
lift|n|电梯|We took the lift to the top floor.|0
garage|n|车库|Dad keeps his tools in the garage.|0
village|n|村庄|My grandparents live in a small village.|1
countryside|n|乡下；郊外|We love walking in the countryside.|0
"""),
("clothes & people", """
clothes|n|衣服|I put my clothes in the cupboard.|1
jacket|n|夹克；外套|Take a jacket because it's cold.|1
sweater|n|毛衣|Grandma made me a red sweater.|0
trainers|n|运动鞋|I need new trainers for sports day.|0
boots|n|靴子|Wear your boots in the snow.|0
scarf|n|围巾|I wear a scarf in winter.|0
gloves|n|手套|My gloves keep my hands warm.|0
pocket|n|口袋|My keys are in my pocket.|0
belt|n|腰带|These trousers need a belt.|0
fashion|n|时尚|My sister is interested in fashion.|0
wear|v|穿；戴|What will you wear to the party?|1
cotton|n|棉；棉布|This shirt is made of cotton.|0
leather|n|皮革|He has a brown leather bag.|0
curly|adj|卷曲的|She has long curly hair.|0
beard|n|胡子|My uncle has a grey beard.|0
teenager|n|青少年|My brother is a teenager now.|0
adult|n|成年人|Children must come with an adult.|0
generous|adj|慷慨的|She is generous and always shares.|0
honest|adj|诚实的|Thank you for being honest with me.|0
polite|adj|有礼貌的|He is always polite to his teachers.|0
shy|adj|害羞的|I was shy on my first day.|0
confident|adj|自信的|She felt confident before the race.|0
lazy|adj|懒惰的|Our cat is very lazy.|0
brave|adj|勇敢的|You were very brave at the dentist.|0
"""),
("language & communication", """
language|n|语言|English is my second language.|1
grammar|n|语法|We learned some new grammar today.|0
vocabulary|n|词汇|Reading helps you learn new vocabulary.|0
translate|v|翻译|Can you translate this sentence for me?|0
spell|v|拼写|How do you spell your name?|1
sentence|n|句子|Write a sentence with this word.|1
paragraph|n|段落|Start a new paragraph here.|0
describe|v|描述|Can you describe your bedroom?|1
compare|v|比较|Compare the two pictures.|0
agree|v|同意|I agree with you.|1
disagree|v|不同意|I disagree with that idea.|0
suggest|v|建议|I suggest we go by bus.|0
advice|n|建议；劝告|My teacher gave me good advice.|0
opinion|n|看法；意见|In my opinion, cats are the best pets.|1
reason|n|原因；理由|Give one reason for your answer.|1
example|n|例子|Can you give me an example?|1
information|n|信息|I need some information about the trip.|1
knowledge|n|知识|He has a lot of knowledge about animals.|0
improve|v|提高；改进|I want to improve my English.|1
mistake|n|错误|Everyone makes a mistake sometimes.|1
understand|v|理解；明白|I understand the question now.|1
conversation|n|对话；交谈|We had a long conversation about school.|0
invite|v|邀请|I want to invite you to my party.|1
reply|v|回复|Please reply to my email soon.|0
"""),
("linking & time words", """
although|conj|虽然|Although it rained, we had fun.|1
however|adv|然而|I like tea. However, I prefer juice.|1
unless|conj|除非|We will go unless it rains.|0
until|prep|直到|I waited until five o'clock.|1
while|conj|当…的时候|I listened to music while I tidied my room.|1
during|prep|在…期间|We talked during the break.|1
since|prep|自从|I have lived here since 2020.|0
already|adv|已经|I have already finished my homework.|1
recently|adv|最近|We recently moved to a new flat.|0
suddenly|adv|突然|Suddenly, the lights went out.|1
finally|adv|终于；最后|Finally, we reached the top of the hill.|1
luckily|adv|幸运地|Luckily, nobody was hurt.|0
unfortunately|adv|不幸地；可惜|Unfortunately, the shop was closed.|0
probably|adv|很可能|It will probably rain tomorrow.|1
especially|adv|尤其|I love fruit, especially mangoes.|0
instead|adv|作为替代|There was no juice, so I had water instead.|1
immediately|adv|立刻|Come here immediately!|0
almost|adv|几乎|It is almost time for dinner.|1
enough|adv|足够|Have you had enough to eat?|1
several|det|几个|I have read this book several times.|0
whole|adj|整个的|I ate the whole pizza.|0
perhaps|adv|也许|Perhaps we can go tomorrow.|1
actually|adv|实际上|Actually, I think you are right.|0
except|prep|除了|Everyone came except Tom.|0
"""),
]

rows, seen, problems = [], set(), []
for week, (topic, block) in enumerate(WEEKS, start=1):
    for line in block.strip().splitlines():
        parts = line.split("|")
        if len(parts) != 5:
            problems.append(f"bad line: {line}"); continue
        word, pos, zh, ex, spell = parts
        if word.lower() in seen: problems.append(f"duplicate: {word}")
        seen.add(word.lower())
        m = re.search(rf"(^|[^A-Za-z])({re.escape(word)}[a-z]*)(?![A-Za-z])", ex, re.I)
        if not m: problems.append(f"example lacks word: {word} / {ex}")
        elif m.group(2).lower() not in (word.lower(), word.lower() + "s", word.lower() + "es"):
            problems.append(f"first match is another word: {word} -> {m.group(2)}")
        rows.append([word, pos, zh, ex, topic, week, spell])

zh_seen = {}
for r in rows:
    if r[2] in zh_seen: problems.append(f"same meaning: {r[0]} / {zh_seen[r[2]]}")
    zh_seen[r[2]] = r[0]

if problems:
    print("\n".join(problems)); sys.exit(1)
with open("public/pet-words.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(["word", "pos", "meaning_zh", "example_en", "topic", "week", "need_spelling"])
    w.writerows(rows)
per_week = [sum(1 for r in rows if r[5] == i) for i in range(1, 13)]
print(len(rows), "words;", sum(r[6] == "1" for r in rows), "need spelling; per week", per_week)
