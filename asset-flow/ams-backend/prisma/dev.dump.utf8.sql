PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);
INSERT INTO _prisma_migrations VALUES('634e541c-c827-43d2-8bec-2f87807c741c','4e6820f8d594579c4a8a0de8015b0b34ab9e42acd6745edeef2df51c27f2a355',1775528582191,'20260407022302_final_fix',NULL,NULL,1775528582148,1);
CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "manufacturer" TEXT,
    "modelNo" TEXT,
    "serialNo" TEXT,
    "unitCost" REAL,
    "location" TEXT,
    "employeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, purchaseDate TEXT, notes TEXT, receipt TEXT, checkoutDate TEXT, expectedCheckinDate TEXT, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT,
    CONSTRAINT "Asset_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO Asset VALUES('b87e8328-eff0-4807-8cb9-2877007dc36d','CB-LAP-0001','Office Laptop 1','Laptop','Available','Dell','Latitude 5420','DL5420-9F3K2L',34987.0,'MIS',NULL,'2026-04-13 05:15:48','2026-04-13 05:15:48','','',NULL,NULL,NULL,0,NULL,NULL,NULL);
INSERT INTO Asset VALUES('68364cb7-dabc-4e40-884e-60a224f27180','CB-LAP-0002','Dev Laptop 1','Laptop','Deployed','hp','elitebook 840 G8','HP840G8-A7X92Q',76000.0,'MIS','fa961050-7ed1-4fb7-a10c-9e6cb89af519','2026-04-13 05:20:16','2026-04-13 05:20:48','',NULL,NULL,'2026-04-13','2030-04-14',0,NULL,NULL,NULL);
INSERT INTO Asset VALUES('203dfbfe-5e42-408f-97d8-ac8b03754036','CB-LAP-0003','Admin Laptop','Laptop','Available','LENOVO','ThinkPad T14','LNV-T14-88KLM2',138000.0,'mis',NULL,'2026-04-13 05:24:08','2026-04-13 05:24:08','','',NULL,NULL,NULL,0,NULL,NULL,NULL);
INSERT INTO Asset VALUES('1f07395e-ab96-4e56-9432-3666c9c9572c','CB-LAP-0004','HR Laptop','Laptop','Available','apple','macbook pro 13"','C02ZK1ABQ6N5',69990.0,'MIS',NULL,'2026-04-13 05:25:25','2026-04-13 05:25:25','','',NULL,NULL,NULL,0,NULL,NULL,NULL);
INSERT INTO Asset VALUES('ce9f8726-9d2e-4737-83bf-58ed4fc3f952','CB-LAP-0005','Finance Laptop','Laptop','Deployed','asus','ExpertBook B9','ASUS-B9450-XY12',137000.0,'MIS','caec8b03-6219-41b4-8c2a-9304ae2e4d71','2026-04-13 05:26:55','2026-04-16 06:37:48','',NULL,NULL,'2026-04-16',NULL,0,NULL,NULL,NULL);
INSERT INTO Asset VALUES('06ad7e49-64a2-41ea-980e-37a3d1b19db3','CB-DES-0006','Sample Asset','Desktop','Available','SAMPLE','SMP1234','SP-1111-1111',9982.0,'MIS',NULL,'2026-04-20 07:48:58','2026-04-20 07:48:58','','',NULL,NULL,NULL,0,NULL,NULL,NULL);
CREATE TABLE IF NOT EXISTS "Accessory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "modelNo" TEXT,
    "location" TEXT,
    "minQty" INTEGER NOT NULL DEFAULT 2,
    "total" INTEGER NOT NULL DEFAULT 0,
    "checkedOut" INTEGER NOT NULL DEFAULT 0
, createdAt TEXT, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT);
INSERT INTO Accessory VALUES('50d67542-c5f7-4524-8b45-733dae74f1a1','Laptop Charger','Charger','65W USB-C','MIS',2,10,2,'2026-04-13',0,NULL,NULL,NULL);
INSERT INTO Accessory VALUES('896ab4c2-17ee-4778-be6b-601b0b4e2350','Docking Station','Docking Station','USB-C Dock G5','MIS',2,5,0,'2026-04-13',0,NULL,NULL,NULL);
INSERT INTO Accessory VALUES('ce2d29dd-eb98-45b2-acf6-4316930441a0','HDMI Cable','Cables','2m HDMI 2.0','MIS',5,13,0,'2026-04-13',0,NULL,NULL,NULL);
INSERT INTO Accessory VALUES('1742f65f-70aa-4489-adb7-d13908d73833','Monitor Stand','Office Equipment','MST-ADJ-01','MIS',2,10,0,'2026-04-20',0,NULL,NULL,NULL);
CREATE TABLE IF NOT EXISTS "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL
, department TEXT, role TEXT, avatar TEXT, createdAt TEXT, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT, employeeNumber TEXT, password TEXT, phone TEXT, jobTitle TEXT);
INSERT INTO Employee VALUES('fa961050-7ed1-4fb7-a10c-9e6cb89af519','Clint perlas','clintperlas@gmail.com','Admin','Superuser','https://ui-avatars.com/api/?name=Clint%20perlas&background=0f172a&color=38bdf8','2026-04-13',0,NULL,NULL,NULL,'001234','123456789','','');
INSERT INTO Employee VALUES('caec8b03-6219-41b4-8c2a-9304ae2e4d71','Walter del rosario','walterdr@proton.com','MIS Department','Superuser','https://ui-avatars.com/api/?name=Walter%20del%20rosario&background=0f172a&color=38bdf8','2026-04-13',0,NULL,NULL,NULL,'00317','','','');
INSERT INTO Employee VALUES('05f3273b-b907-4c08-8fb7-7d4a36d81061','User','viewer@centralbooks.com','HR','User','https://ui-avatars.com/api/?name=User&background=0f172a&color=38bdf8','2026-04-15',0,NULL,NULL,NULL,'','','','');
INSERT INTO Employee VALUES('d2b97aec-4f2d-4958-8850-2e761307912a','viewer','view@centralbooks.com','Operations','User','https://ui-avatars.com/api/?name=viewer&background=0f172a&color=38bdf8','2026-04-15',0,NULL,NULL,NULL,'','','','');
INSERT INTO Employee VALUES('134278e2-7c24-4faf-9a5e-a1d0a2554802','Admin user (1)','admin1@centralbooks.com','Operations','Admin','https://ui-avatars.com/api/?name=Admin%20user%20(1)&background=0f172a&color=38bdf8','2026-04-15',0,NULL,NULL,NULL,'','','','');
CREATE TABLE IF NOT EXISTS "AssetLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE Component (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                model TEXT,
                location TEXT,
                total INTEGER NOT NULL,
                remaining INTEGER NOT NULL,
                minQty INTEGER DEFAULT 0
            , status TEXT, assignedTo TEXT, checkoutDate TEXT, expectedCheckinDate TEXT, notes TEXT, unitCost REAL DEFAULT 0, createdAt TEXT, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT);
INSERT INTO Component VALUES(1,'512GB SSD','STORAGE (SSD/HDD)','SSD-512-NVME','MIS',40,40,10,'AVAILABLE',NULL,NULL,NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',0,NULL,NULL,NULL);
INSERT INTO Component VALUES(2,'Power Supply 500W','POWER','PSU-500W-ATX','MIS',10,10,5,'AVAILABLE',NULL,NULL,NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',0,NULL,NULL,NULL);
INSERT INTO Component VALUES(3,'8GB DDR4 RAM','MEMORY (RAM)','DDR4-8GB-2666','MIS ',40,40,10,'AVAILABLE',NULL,NULL,NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',0,NULL,NULL,NULL);
INSERT INTO Component VALUES(4,'1TB HDD','STORAGE (SSD/HDD)','HDD-1TB-7200','MIS',20,19,5,'DEPLOYED','CB-LAP-0005 ΓÇö Finance Laptop','2026-04-22',NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',0,NULL,NULL,NULL);
INSERT INTO Component VALUES(5,'Graphics Card GTX 1660','GPU','GTX1660-6GB','MIS',3,3,6,'AVAILABLE',NULL,NULL,NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',1,'2026-04-21T07:19:45.467Z','134278e2-7c24-4faf-9a5e-a1d0a2554802','Admin user (1)');
INSERT INTO Component VALUES(6,'Network Interface Card','NETWORKING','NIC-1GB-PCIe','MIS ',20,20,6,'DEPLOYED',NULL,'2026-04-15',NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',0,NULL,NULL,NULL);
INSERT INTO Component VALUES(7,'sample component','MEMORY (RAM)','SMPP-1111','MIS',10,10,2,'AVAILABLE',NULL,NULL,NULL,NULL,0.0,'2026-04-21T06:37:24.936Z',1,'2026-04-21T07:19:42.323Z','134278e2-7c24-4faf-9a5e-a1d0a2554802','Admin user (1)');
CREATE TABLE ComponentAssignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                componentId INTEGER NOT NULL,
                assetId INTEGER NOT NULL,
                assignedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (componentId) REFERENCES Component(id)
            );
CREATE TABLE Consumable (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      category     TEXT,
      modelNo      TEXT,
      location     TEXT,
      itemNo       TEXT,
      orderNumber  TEXT,
      purchaseDate TEXT,
      minQty       INTEGER DEFAULT 0,
      total        INTEGER DEFAULT 0,
      remaining    INTEGER DEFAULT 0,
      unitCost     REAL DEFAULT 0,
      createdAt    TEXT DEFAULT (datetime('now'))
    , isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT);
INSERT INTO Consumable VALUES('1790f2b7-7a72-459a-9a6d-53b7413a1d57','Ink Cartridge Black','Printer Ink','HP-INK-BLK-680','Production','8473156','PO-9981','2026-04-13',4,20,20,950.0,'2026-04-13 05:56:13',0,NULL,NULL,NULL);
INSERT INTO Consumable VALUES('1c1796ab-3b96-43b8-b282-35a4e964b6d4','Ink Cartridge Color','Printer Ink','CAN-INK-CL-811','Publishing On Demand','6621983','PO-9985','2026-04-10',6,18,20,1200.0,'2026-04-13 05:57:44',0,NULL,NULL,NULL);
INSERT INTO Consumable VALUES('d85f8cea-4083-4927-8a89-e40437743f9d','A4 Bond Paper 80gsm','Paper','A4-80G-DA','Production','7712459','PO-10012','2026-04-08',30,120,20,250.0,'2026-04-13 06:00:40',0,NULL,NULL,NULL);
INSERT INTO Consumable VALUES('c66f0413-f48b-414e-bae9-e091e045e65f','Toner Cartridge','Printer Supply','BRO-TNR-TN2360','Production','5543217','PO-10078','2026-04-02',4,12,20,1800.0,'2026-04-13 06:14:32',0,NULL,NULL,NULL);
INSERT INTO Consumable VALUES('0861db26-229b-47d4-8347-b958de5d2fe8','Staple Wire','Office Supplies','STPL-STD-26/6','POD','123456','PO-12345','2026-04-20',2,20,20,15.0,'2026-04-20 07:54:44',0,NULL,NULL,NULL);
CREATE TABLE License (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      key            TEXT,
      manufacturer   TEXT,
      licensedEmail  TEXT,
      expirationDate TEXT,
      minQty         INTEGER DEFAULT 2,
      total          INTEGER DEFAULT 0,
      avail          INTEGER DEFAULT 0,
      createdAt      TEXT DEFAULT (datetime('now'))
    , unitCost REAL DEFAULT 0, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT);
INSERT INTO License VALUES('0d778113-ec19-4b91-a0f2-34a00a3096da','Microsoft Office 365','XXXX-YYYY-ZZZZ-1111','Microsoft','walterdr@proton.com','2030-12-31',2,47,10,'2026-04-13 05:31:42',0.0,0,NULL,NULL,NULL);
INSERT INTO License VALUES('2395b9dd-e4d9-4a1e-8917-69d2f5734a8f','Windows 11 Pro','WIN11-PRO-8822-ABCD','microsoft','clintperlas@gmail.com','',2,100,76,'2026-04-13 05:33:45',0.0,0,NULL,NULL,NULL);
INSERT INTO License VALUES('0217e55a-e18c-4a6b-b0b7-75f0ef21afde','Adobe Photoshop','ADB-PS-9922-XYZ','Adobe','','2030-10-15',2,20,5,'2026-04-13 05:42:30',0.0,0,NULL,NULL,NULL);
INSERT INTO License VALUES('2cf6a7a6-c569-459e-a591-16bc92ae37b9','Antivirus Endpoint','KASP-SEC-2026-001','Kaspersky','','2026-08-01',2,200,155,'2026-04-13 05:46:10',0.0,1,'2026-04-22T06:33:45.416Z','fa961050-7ed1-4fb7-a10c-9e6cb89af519','Clint perlas');
CREATE TABLE Maintenance (
      id        TEXT PRIMARY KEY,
      assetName TEXT,
      issue     TEXT,
      status    TEXT DEFAULT 'Pending',
      priority  TEXT DEFAULT 'Medium',
      cost      REAL DEFAULT 0,
      startDate TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    , title TEXT, description TEXT, submittedBy TEXT, submittedById TEXT, submittedAt TEXT, assetId TEXT, category TEXT, updatedAt TEXT, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT);
INSERT INTO Maintenance VALUES('ab53311c-c652-48c7-afd9-52670a6f891c','Malware','Worms in the asset','Open','High',0.0,'2026-04-21T07:20:19.751Z','2026-04-21T07:20:19.775Z','Malware','Worms in the asset','Admin user (1)','134278e2-7c24-4faf-9a5e-a1d0a2554802','2026-04-21T07:20:19.751Z','','Hardware','2026-04-21T07:20:19.775Z',0,NULL,NULL,NULL);
CREATE TABLE Request (
      id            TEXT PRIMARY KEY,
      requestNumber TEXT,
      requestorName TEXT,
      department    TEXT,
      managerName   TEXT,
      dateSubmitted TEXT,
      items         TEXT DEFAULT '[]',
      status        TEXT DEFAULT 'Pending',
      createdAt     TEXT DEFAULT (datetime('now'))
    , submittedById TEXT, submittedByEmail TEXT, isArchived INTEGER DEFAULT 0, archivedAt TEXT, archivedById TEXT, archivedByName TEXT);
INSERT INTO Request VALUES('05ebaecf-9cc6-4167-824c-dcb66f080865','REQ-2026-1645','Admin user (1)','Operations','','April 21, 2026','[{"id":1776739651621,"type":"Laptop","customType":"","processor":"","ram":"","quantity":1}]','Pending','2026-04-21 02:47:48','134278e2-7c24-4faf-9a5e-a1d0a2554802','admin1@centralbooks.com',0,NULL,NULL,NULL);
CREATE TABLE AuditLog (
      id        TEXT PRIMARY KEY,
      timestamp TEXT,
      type      TEXT,
      entity    TEXT,
      message   TEXT,
      user      TEXT DEFAULT 'ADMIN',
      createdAt TEXT DEFAULT (datetime('now'))
    );
INSERT INTO AuditLog VALUES('eb81d102-452f-4b58-90a1-cd21bf0c2cf5','4/13/2026, 1:15:48 PM','ADDED','Office Laptop 1','CB-LAP-0001 registered in assets','ADMIN','2026-04-13 05:15:48');
INSERT INTO AuditLog VALUES('b2462620-88db-4df9-b401-b0899d65214b','4/13/2026, 1:16:36 PM','ADDED','Clint perlas','Employee onboarded to MIS','ADMIN','2026-04-13 05:16:36');
INSERT INTO AuditLog VALUES('b14df716-ccb0-483b-8935-9481be48f4c2','4/13/2026, 1:20:16 PM','ADDED','Dev Laptop 1','CB-LAP-0002 registered in assets','ADMIN','2026-04-13 05:20:16');
INSERT INTO AuditLog VALUES('93e01292-2954-412c-a4bf-4f63d6cee700','4/13/2026, 1:20:48 PM','CHECKOUT','Dev Laptop 1','CB-LAP-0002 checked out to Clint perlas','ADMIN','2026-04-13 05:20:48');
INSERT INTO AuditLog VALUES('0a84beab-a909-4cf2-9e1e-a0854e63f6ec','4/13/2026, 1:21:25 PM','ADDED','Walter del rosario','Employee onboarded to MIS','ADMIN','2026-04-13 05:21:25');
INSERT INTO AuditLog VALUES('f13261fa-aaaa-4fa6-bd7d-896d1e7eb2d6','4/13/2026, 1:24:08 PM','ADDED','Admin Laptop','CB-LAP-0003 registered in assets','ADMIN','2026-04-13 05:24:08');
INSERT INTO AuditLog VALUES('64b68081-aa1d-476f-a3ae-cbc8201da77d','4/13/2026, 1:25:25 PM','ADDED','HR Laptop','CB-LAP-0004 registered in assets','ADMIN','2026-04-13 05:25:25');
INSERT INTO AuditLog VALUES('c6e42205-b64f-48ac-9f1b-003fb7ca6e27','4/13/2026, 1:26:55 PM','ADDED','Finance Laptop','CB-LAP-0005 registered in assets','ADMIN','2026-04-13 05:26:55');
INSERT INTO AuditLog VALUES('1e1dbab5-bbeb-45a3-8e43-99b3e92194bd','4/13/2026, 1:47:11 PM','ADDED','Laptop Charger','Accessory added to inventory','ADMIN','2026-04-13 05:47:11');
INSERT INTO AuditLog VALUES('8f75e09e-c709-4156-aa23-e6d8592aa415','4/13/2026, 1:47:29 PM','UPDATED','Laptop Charger','Accessory updated','ADMIN','2026-04-13 05:47:29');
INSERT INTO AuditLog VALUES('9ea6e762-12b2-4306-8298-924127261149','4/13/2026, 1:47:33 PM','CHECKOUT','Laptop Charger','1 accessory unit(s) checked out','ADMIN','2026-04-13 05:47:33');
INSERT INTO AuditLog VALUES('e8f57a96-868d-4562-b65b-1fba9692a883','4/13/2026, 1:48:26 PM','ADDED','Docking Station','Accessory added to inventory','ADMIN','2026-04-13 05:48:26');
INSERT INTO AuditLog VALUES('e3ca15d4-230d-4425-a378-6a7a8a491077','4/13/2026, 1:48:33 PM','CHECKIN','Laptop Charger','1 accessory unit(s) checked in','ADMIN','2026-04-13 05:48:33');
INSERT INTO AuditLog VALUES('80b295f6-e044-4d8b-8f76-90bd334ece36','4/13/2026, 1:49:06 PM','ADDED','HDMI Cable','Accessory added to inventory','ADMIN','2026-04-13 05:49:06');
INSERT INTO AuditLog VALUES('bd21ff34-9ee5-425c-b156-0b52271ce3c0','4/13/2026, 1:49:40 PM','ADDED','External HDD','Accessory added to inventory','ADMIN','2026-04-13 05:49:40');
INSERT INTO AuditLog VALUES('f744f55b-663a-4497-898d-4c7fb56613fa','4/13/2026, 1:51:19 PM','ADDED','USB Flash Drive','Accessory added to inventory','ADMIN','2026-04-13 05:51:19');
INSERT INTO AuditLog VALUES('3987b0b2-e0ff-4e1b-ad44-9491a109da7b','4/13/2026, 1:56:13 PM','ADDED','Ink Cartridge Black','Consumable item added to inventory','ADMIN','2026-04-13 05:56:13');
INSERT INTO AuditLog VALUES('babbbec8-e9bc-4b80-a2df-8aace6b31e09','4/13/2026, 1:57:44 PM','ADDED','Ink Cartridge Color','Consumable item added to inventory','ADMIN','2026-04-13 05:57:44');
INSERT INTO AuditLog VALUES('bb7469d8-ba05-4e7f-af4c-9d039d12e7c2','4/13/2026, 2:00:40 PM','ADDED','A4 Bond Paper 80gsm','Consumable item added to inventory','ADMIN','2026-04-13 06:00:40');
INSERT INTO AuditLog VALUES('b73178ba-7d9e-4ce7-854a-b23c0a98aa71','4/13/2026, 2:14:32 PM','ADDED','Toner Cartridge','Consumable item added to inventory','ADMIN','2026-04-13 06:14:32');
INSERT INTO AuditLog VALUES('8f59cffa-b406-4b56-bdcb-5eba05eb1e88','4/13/2026, 2:15:37 PM','ADDED','Ballpen (black)','Consumable item added to inventory','ADMIN','2026-04-13 06:15:37');
INSERT INTO AuditLog VALUES('c1e4589e-b4d0-4c3a-be2f-b20356ec3b99','4/15/2026, 10:00:13 AM','ADDED','User','Employee onboarded to HR','ADMIN','2026-04-15 02:00:14');
INSERT INTO AuditLog VALUES('58783023-8ad5-4735-859f-48ce0f84d33e','4/15/2026, 10:00:32 AM','CHECKOUT','Network Interface Card','Network Interface Card deployed','ADMIN','2026-04-15 02:00:32');
INSERT INTO AuditLog VALUES('d91fd56a-c61d-45d0-8966-45a7d2f3039e','4/15/2026, 10:01:20 AM','UPDATED','User','Employee profile updated','ADMIN','2026-04-15 02:01:20');
INSERT INTO AuditLog VALUES('34935b2f-ad2d-4753-8f16-0e865a21aa5f','4/15/2026, 10:01:59 AM','CHECKOUT','Laptop Charger','1 accessory unit(s) checked out','ADMIN','2026-04-15 02:01:59');
INSERT INTO AuditLog VALUES('64142bd9-2514-495a-a4db-1540ea2e2b29','4/15/2026, 10:03:22 AM','ADDED','viewer','Employee onboarded to Operations','ADMIN','2026-04-15 02:03:22');
INSERT INTO AuditLog VALUES('ee60505d-b661-4406-a57a-44a9fe0085ef','4/15/2026, 1:52:44 PM','ADDED','Admin user (1)','Employee onboarded to Operations','ADMIN','2026-04-15 05:52:44');
INSERT INTO AuditLog VALUES('2f6b950b-7f26-4c74-88a8-bfbe8b15998d','4/16/2026, 8:49:28 AM','REQUESTED','Clint Perlas','ASSET','ADMIN','2026-04-16 00:49:28');
INSERT INTO AuditLog VALUES('3b7dae52-05a4-4e98-9817-ee8b67242b90','4/16/2026, 11:23:05 AM','REQUESTED','Clint Perlas','ASSET','ADMIN','2026-04-16 03:23:05');
INSERT INTO AuditLog VALUES('a403c9a7-640c-4958-bec9-543fa014c3ef','4/16/2026, 1:08:24 PM','ADDED','Sample acc','Accessory added to inventory','ADMIN','2026-04-16 05:08:24');
INSERT INTO AuditLog VALUES('bc654325-d175-42b2-a715-0fd477b7b7ea','4/16/2026, 1:08:39 PM','UPDATED','Sample acc','Accessory updated','ADMIN','2026-04-16 05:08:39');
INSERT INTO AuditLog VALUES('2d1be86b-06b4-4756-95b3-c9589a9972bc','4/16/2026, 1:08:55 PM','UPDATED','Sample acc','Accessory updated','ADMIN','2026-04-16 05:08:55');
INSERT INTO AuditLog VALUES('dddeda4e-e561-4d34-b0e4-84470ae63a61','4/16/2026, 1:09:02 PM','UPDATED','Sample acc','Accessory updated','ADMIN','2026-04-16 05:09:02');
INSERT INTO AuditLog VALUES('42fdba93-f97e-4749-b313-3ba14ad67198','4/16/2026, 1:43:33 PM','DELETED','External HDD','Accessory deleted','ADMIN','2026-04-16 05:43:33');
INSERT INTO AuditLog VALUES('d6ca9783-d176-4bc2-84e4-75b2cbe73ed8','4/16/2026, 1:45:24 PM','DELETED','USB Flash Drive','Accessory deleted','ADMIN','2026-04-16 05:45:24');
INSERT INTO AuditLog VALUES('78a7364e-54c9-4c33-beb1-ccb8f12aff69','4/16/2026, 2:37:48 PM','CHECKOUT','Finance Laptop','CB-LAP-0005 checked out to Walter del rosario','ADMIN','2026-04-16 06:37:48');
INSERT INTO AuditLog VALUES('97c4babe-d49e-41b0-a082-d6c2d8615da1','4/20/2026, 3:48:58 PM','ADDED','Sample Asset','CB-DES-0006 registered in assets','ADMIN','2026-04-20 07:48:59');
INSERT INTO AuditLog VALUES('eb72ce52-be9d-45e9-b4a9-92e2cb0fc2fd','4/20/2026, 3:53:31 PM','ADDED','Monitor Stand','Accessory added to inventory','ADMIN','2026-04-20 07:53:31');
INSERT INTO AuditLog VALUES('1e056c16-c0f8-4b59-9c66-986f769cefac','4/20/2026, 3:54:44 PM','ADDED','Staple Wire','Consumable item added to inventory','ADMIN','2026-04-20 07:54:44');
INSERT INTO AuditLog VALUES('bdbdf69d-788d-425c-98b9-a7f56122a3cf','4/21/2026, 10:47:48 AM','REQUESTED','Admin user (1)','Submitted REQ-2026-1645','ADMIN','2026-04-21 02:47:48');
INSERT INTO AuditLog VALUES('5ead8de5-5b8f-4d1e-87d2-764b091acd92','4/21/2026, 11:10:45 AM','REQUESTED','Admin user (1)','Submitted REQ-2026-9640','ADMIN','2026-04-21 03:10:45');
INSERT INTO AuditLog VALUES('cd36acb9-1a00-40dc-b12c-92b649b1b67b','4/21/2026, 2:15:46 PM','DELETED','Sample acc','Accessory deleted','ADMIN','2026-04-21 06:15:46');
INSERT INTO AuditLog VALUES('b485c5fc-7848-4b7c-af09-3fcaeca913e6','4/21/2026, 2:16:54 PM','DELETED','Antivirus Endpoint','Software license removed','ADMIN','2026-04-21 06:16:54');
INSERT INTO AuditLog VALUES('c9ca7d9b-1466-4cd0-b21f-2336a1d80951','4/21/2026, 2:17:13 PM','DELETED','Ballpen (black)','Consumable item deleted','ADMIN','2026-04-21 06:17:13');
INSERT INTO AuditLog VALUES('d82aee53-c8a1-41e1-a575-edeb20144ee4','4/21/2026, 3:19:15 PM','DELETED','REQ-2026-9640','Request permanently deleted','ADMIN','2026-04-21T07:19:15.323Z');
INSERT INTO AuditLog VALUES('9f3d5775-e4a3-448b-a4e5-75289a2dbc63','4/21/2026, 3:19:42 PM','ARCHIVED','sample component','sample component component archived','Admin user (1)','2026-04-21T07:19:42.331Z');
INSERT INTO AuditLog VALUES('36e54f68-7cbc-491e-97bd-b32004e4f4f6','4/21/2026, 3:19:45 PM','ARCHIVED','Graphics Card GTX 1660','Graphics Card GTX 1660 component archived','Admin user (1)','2026-04-21T07:19:45.515Z');
INSERT INTO AuditLog VALUES('053084ba-47dc-4aa6-acb8-5ea267dbfdc7','4/21/2026, 3:20:19 PM','ADDED','Malware','Maintenance ticket submitted','ADMIN','2026-04-21T07:20:19.798Z');
INSERT INTO AuditLog VALUES('19f82e2a-e527-403f-8c6b-37dbba215bee','4/21/2026, 3:48:10 PM','ARCHIVED','Malware','Malware archived','Admin user (1)','2026-04-21T07:48:10.809Z');
INSERT INTO AuditLog VALUES('2b535541-5541-4aa6-a72f-623e8c2b1f12','4/21/2026, 3:48:14 PM','RESTORED','Malware','Malware restored','Admin user (1)','2026-04-21T07:48:14.584Z');
INSERT INTO AuditLog VALUES('ab0695cb-12f9-495a-a8e3-025059cecd1d','4/22/2026, 11:26:39 AM','CHECKOUT','1TB HDD','1 component unit(s) installed on CB-LAP-0005 ΓÇö Finance Laptop','Admin user (1)','2026-04-22T03:26:39.422Z');
INSERT INTO AuditLog VALUES('62ed6c79-fe41-4660-894e-efe1bee7e59c','4/22/2026, 11:28:31 AM','CHECKOUT','Laptop Charger','1 accessory unit(s) attached to CB-LAP-0005 ΓÇö Finance Laptop','Admin user (1)','2026-04-22T03:28:31.256Z');
INSERT INTO AuditLog VALUES('a8705407-ed1f-4d13-95b9-72ffea28e2e9','4/22/2026, 2:07:34 PM','UPDATED','Walter del rosario','00317 employee profile updated','ADMIN','2026-04-22T06:07:34.465Z');
INSERT INTO AuditLog VALUES('6df48a22-3043-48dc-827c-2e47440d131c','4/22/2026, 2:27:05 PM','UPDATED','Clint perlas','001234 employee profile updated','ADMIN','2026-04-22T06:27:05.125Z');
INSERT INTO AuditLog VALUES('a3890795-8008-4d97-80f2-86b157de0d36','4/22/2026, 2:33:45 PM','ARCHIVED','Antivirus Endpoint','Antivirus Endpoint license archived','Clint perlas','2026-04-22T06:33:45.424Z');
CREATE TABLE ComponentAssignment (
      id TEXT PRIMARY KEY,
      componentId TEXT NOT NULL,
      assetId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      assignedAt TEXT NOT NULL,
      checkoutDate TEXT,
      expectedCheckinDate TEXT,
      assignedById TEXT,
      assignedByName TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      removedAt TEXT
    );
INSERT INTO ComponentAssignment VALUES('ddd1df6a-76c7-4c48-93d1-0f8cc50a340a','4','ce9f8726-9d2e-4737-83bf-58ed4fc3f952',1,'2026-04-22T03:26:39.374Z','2026-04-22',NULL,'134278e2-7c24-4faf-9a5e-a1d0a2554802','Admin user (1)',NULL,'ACTIVE',NULL);
CREATE TABLE AccessoryAssignment (
      id TEXT PRIMARY KEY,
      accessoryId TEXT NOT NULL,
      assetId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      assignedAt TEXT NOT NULL,
      assignedById TEXT,
      assignedByName TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      removedAt TEXT
    );
INSERT INTO AccessoryAssignment VALUES('3e990ec8-9820-4cec-a545-649b7b0bc767','50d67542-c5f7-4524-8b45-733dae74f1a1','ce9f8726-9d2e-4737-83bf-58ed4fc3f952',1,'2026-04-22T03:28:31.206Z','134278e2-7c24-4faf-9a5e-a1d0a2554802','Admin user (1)',NULL,'ACTIVE',NULL);
PRAGMA writable_schema=ON;
CREATE TABLE IF NOT EXISTS sqlite_sequence(name,seq);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('Component',7);
CREATE UNIQUE INDEX "Asset_tag_key" ON "Asset"("tag");
CREATE UNIQUE INDEX "Asset_serialNo_key" ON "Asset"("serialNo");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE INDEX idx_component_assignment_component
    ON ComponentAssignment(componentId, status)
  ;
CREATE INDEX idx_component_assignment_asset
    ON ComponentAssignment(assetId, status)
  ;
CREATE INDEX idx_accessory_assignment_accessory
    ON AccessoryAssignment(accessoryId, status)
  ;
CREATE INDEX idx_accessory_assignment_asset
    ON AccessoryAssignment(assetId, status)
  ;
CREATE UNIQUE INDEX idx_employee_employeeNumber_unique
    ON Employee(employeeNumber)
    WHERE employeeNumber IS NOT NULL AND trim(employeeNumber) != ''
  ;
PRAGMA writable_schema=OFF;
COMMIT;

