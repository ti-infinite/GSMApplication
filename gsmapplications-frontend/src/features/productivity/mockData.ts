import type { AssignmentWizardConfig } from './types'

export const MOCK_WIZARD_DATA: AssignmentWizardConfig = {
  itc: 'ITC-2026-001',

  categories: [
    { IdCategory: '1', Descr: 'HERBS', Code: 'H', AggregatedCode: 'H', IsSKU: true, IdSKUTemplate: 1 },
    {
      IdCategory: '2', Descr: 'TEST', Code: 'T', AggregatedCode: 'T', IsSKU: true, IdSKUTemplate: 1,
      Children: [
        { IdCategory: 3, Descr: 'TestChild', Code: 'TC', AggregatedCode: 'TTC', IsSKU: true, IdSKUTemplate: 0 },
      ],
    },
  ],

  skuTemplates: [
    {
      IdSKUTemplate: 1, ShortName: 'HERBS', Descr: 'HERBS',
      SKUR: [
        { IdSKUTemplateRule: 1, IdSKUTemplate: 1, RuleName: 'HERB CLASS',   IdParameter: 1, Order: 1 },
        { IdSKUTemplateRule: 2, IdSKUTemplate: 1, RuleName: 'HERB TYPE',    IdParameter: 2, Order: 2 },
        { IdSKUTemplateRule: 3, IdSKUTemplate: 1, RuleName: 'HERB',         IdParameter: 3, Order: 3 },
        { IdSKUTemplateRule: 4, IdSKUTemplate: 1, RuleName: 'HERB PACKING', IdParameter: 4, Order: 4 },
      ],
    },
  ],

  parameters: [
    {
      idParameter: 1, paramCategory: 'HBCLASS', shortName: 'HERB CLASS', descr: 'Clase de la hierba',
      paramAttributes: [
        { shortName: 'Conventional', code: 'C', descr: 'Conventional' },
        { shortName: 'Organic',      code: 'O', descr: 'Organic' },
      ],
    },
    {
      idParameter: 2, paramCategory: 'HBTYPE', shortName: 'HERB TYPE', descr: 'Tipo de hierba',
      paramAttributes: [
        { shortName: 'Regular',   code: 'R', descr: 'Regular' },
        { shortName: 'Potted',    code: 'P', descr: 'Potted' },
        { shortName: 'Specialty', code: 'S', descr: 'Specialty' },
      ],
    },
    {
      idParameter: 3, paramCategory: 'HERB', shortName: 'HERB', descr: 'Hierba',
      paramAttributes: [
        { shortName: 'Arugula',  code: 'ARUG', descr: 'Arugula' },
        { shortName: 'Bok Choy', code: 'BOKC', descr: 'Bok Choy' },
        { shortName: 'Basil',    code: 'BASI', descr: 'Basil' },
        { shortName: 'Cilantro', code: 'CILA', descr: 'Cilantro' },
      ],
    },
    {
      idParameter: 4, paramCategory: 'HBPACK', shortName: 'HERB PACKING', descr: 'Empaque',
      paramAttributes: [
        { shortName: 'Tub',       code: 'TUB', descr: 'Tub' },
        { shortName: 'Bag',       code: 'BAG', descr: 'Bag' },
        { shortName: 'Clamshell', code: 'CLA', descr: 'Clamshell' },
        { shortName: 'Box',       code: 'BOX', descr: 'Box' },
      ],
    },
  ],

  masterProducts: [
    {
        "MasterProductName": "Conventional Regular ARUGULA TUB 4 OZ",
        "SKU": "HCRARUGTUB000000012",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 16,
                "Name": "ARUGULA - TUB 4 OZ 8 CT Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular ARUGULA BAG 4 OZ",
        "SKU": "HCRARUGBAG000000017",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 23,
                "Name": "Arugula 4 oz Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular ARUGULA CLAM 1 OZ",
        "SKU": "HCRARUGCLA000000020",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 27,
                "Name": "Arugula Clamshell 1oz 3 pk Conventional",
                "Qty": 3.0
            },
            {
                "IdVariety": 42,
                "Name": "Baby Arugula Clamshell 1oz 3 pk Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular ARUGULA TUB 4 OZ",
        "SKU": "HCRARUGTUB000000012",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 45,
                "Name": "Baby Arugula Tub 4 oz Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Specialy BOK CHOY BAG 3 OZ",
        "SKU": "HCSBOKCBAG000000027",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 3.0,
        "MV": [
            {
                "IdVariety": 46,
                "Name": "BABY BOK CHOY - 1 CT BAG Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Specialy BOK CHOY TUB 16 OZ",
        "SKU": "HCSBOKCTUB000000030",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 49,
                "Name": "BABY BOK CHOY - 1 LB TUB 9 PK Conventional",
                "Qty": 9.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Specialy BOK CHOY BOX 16 OZ",
        "SKU": "HCSBOKCBOX000000032",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 51,
                "Name": "BABY BOK CHOY - 1LB. 12CT. BOX Conventional",
                "Qty": 12.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Specialy BOK CHOY BAG 3 OZ",
        "SKU": "HCSBOKCBAG000000027",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 3.0,
        "MV": [
            {
                "IdVariety": 53,
                "Name": "BABY BOK CHOY - 2 CT BAG Conventional",
                "Qty": 2.0
            },
            {
                "IdVariety": 56,
                "Name": "BABY BOK CHOY - 3 CT BAG Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Specialy BOK CHOY BOX 16 OZ",
        "SKU": "HCSBOKCBOX000000032",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 61,
                "Name": "Baby bok choy 30 lb Conventional",
                "Qty": 30.0
            },
            {
                "IdVariety": 62,
                "Name": "Baby bok choy 5lb bag Conventional",
                "Qty": 5.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Specialy BOK CHOY BAG 16 OZ",
        "SKU": "HCSBOKCBAG000000028",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 69,
                "Name": "Baby bok choy Master/LB Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BUNCH 16 OZ",
        "SKU": "HCRBASIBUN000000039",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 79,
                "Name": "Basil  - 1lb Bag and Box Bunched Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BUNCH 1 OZ",
        "SKU": "HORBASIBUN000000042",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 82,
                "Name": "BASIL - 1 OZ BUNCH 12 PK Organic",
                "Qty": 12.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 16 OZ",
        "SKU": "HCRBASIBOX000000038",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 83,
                "Name": "BASIL - 2 LB BAG AND BOX Conventional",
                "Qty": 2.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL TUB 2.5 OZ",
        "SKU": "HCRBASITUB000000046",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.5,
        "MV": [
            {
                "IdVariety": 87,
                "Name": "BASIL - 2.5 OZ 3 PK WM Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 2.5 OZ",
        "SKU": "HORBASICLA000000047",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.5,
        "MV": [
            {
                "IdVariety": 88,
                "Name": "BASIL - 2.5 OZ 3 PK WM Organic",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL WRAPPED 16 OZ",
        "SKU": "HCRBASIWRA000000051",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 94,
                "Name": "BASIL - 3 LB BAG AND BOX WRAPPED Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 0.75 OZ",
        "SKU": "HORBASICLA000000052",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.75,
        "MV": [
            {
                "IdVariety": 95,
                "Name": "BASIL - 3/4 OZ CLAMSHELL Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BUNCH 4 OZ",
        "SKU": "HCRBASIBUN000000054",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 97,
                "Name": "BASIL - 4 OZ BUNCH 15 PK Conventional",
                "Qty": 15.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 0.5 OZ",
        "SKU": "HCRBASICLA000000056",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 99,
                "Name": "BASIL - CLAMSHELL 0.5 OZ 3 PK Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 0.5 OZ",
        "SKU": "HORBASICLA000000057",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 100,
                "Name": "BASIL - CLAMSHELL 0.5 OZ 3 PK Organic",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 0.5 OZ",
        "SKU": "HCRBASICLA000000056",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 101,
                "Name": "BASIL - CLAMSHELL 0.5 OZ 6 PK Conventional",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 0.5 OZ",
        "SKU": "HORBASICLA000000057",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 102,
                "Name": "BASIL - CLAMSHELL 0.5 OZ 6 PK Organic",
                "Qty": 6.0
            },
            {
                "IdVariety": 105,
                "Name": "BASIL - CLAMSHELL 0.5 OZ Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 1.5 OZ",
        "SKU": "HCRBASICLA000000059",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.5,
        "MV": [
            {
                "IdVariety": 108,
                "Name": "BASIL - CLAMSHELL 1.5 OZ 6 PK Conventional",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 1.5 OZ",
        "SKU": "HORBASICLA000000060",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.5,
        "MV": [
            {
                "IdVariety": 110,
                "Name": "BASIL - CLAMSHELL 1.5 OZ 6PK Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 1.5 OZ",
        "SKU": "HCRBASICLA000000059",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.5,
        "MV": [
            {
                "IdVariety": 111,
                "Name": "BASIL - CLAMSHELL 1.5 OZ Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 1.5 OZ",
        "SKU": "HORBASICLA000000060",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.5,
        "MV": [
            {
                "IdVariety": 112,
                "Name": "BASIL - CLAMSHELL 1.5 OZ Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 0.25 OZ",
        "SKU": "HCRBASICLA000000061",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.25,
        "MV": [
            {
                "IdVariety": 114,
                "Name": "BASIL - CLAMSHELL 1/4 OZ Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Potted BASIL BOX 16 OZ",
        "SKU": "HOPBASIBOX000000066",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 123,
                "Name": "BASIL - POTTED HERBS 6CT WM Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 0.5 OZ",
        "SKU": "HORBASICLA000000057",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 124,
                "Name": "BASIL - SP CLAMSHELL 0.5 OZ 6 PK Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BAG 16 OZ",
        "SKU": "HORBASIBAG000000067",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 125,
                "Name": "BASIL - SP MASTER/LB Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL TUB 2 OZ",
        "SKU": "HORBASITUB000000068",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.0,
        "MV": [
            {
                "IdVariety": 126,
                "Name": "BASIL - SP TUB 2.0 OZ 6 PK Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 0.25 OZ",
        "SKU": "HCRBASICLA000000061",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.25,
        "MV": [
            {
                "IdVariety": 127,
                "Name": "BASIL - SPRIGS CLAMSHELL 1/4OZ Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL TUB 2 OZ",
        "SKU": "HORBASITUB000000068",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.0,
        "MV": [
            {
                "IdVariety": 129,
                "Name": "BASIL - TUB 2.0 OZ 6 PK Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL TUB 3 OZ",
        "SKU": "HORBASITUB000000069",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 3.0,
        "MV": [
            {
                "IdVariety": 130,
                "Name": "BASIL - TUB 3.0 OZ Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 35.2 OZ",
        "SKU": "HCRBASIBOX000000070",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 35.2,
        "MV": [
            {
                "IdVariety": 133,
                "Name": "Basil 1 Kg Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 35.2 OZ",
        "SKU": "HCRBASIBAG000000072",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 35.2,
        "MV": [
            {
                "IdVariety": 135,
                "Name": "Basil 1 Kg Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 16 OZ",
        "SKU": "HCRBASIBOX000000038",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 136,
                "Name": "Basil 1 lb Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BOX 16 OZ",
        "SKU": "HORBASIBOX000000073",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 137,
                "Name": "Basil 1 lb Bag and Box Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 16 OZ",
        "SKU": "HCRBASIBAG000000041",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 138,
                "Name": "Basil 1 lb Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BAG 16 OZ",
        "SKU": "HORBASIBAG000000067",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 139,
                "Name": "Basil 1 lb Bag Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 16 OZ",
        "SKU": "HCRBASIBAG000000041",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 144,
                "Name": "Basil 10Lb Bag Conventional",
                "Qty": 10.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL WRAPPED 16 OZ",
        "SKU": "HCRBASIWRA000000051",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 147,
                "Name": "BASIL 1LB BAG AND BOX WRAPPED - BOX Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL TUB 2.5 OZ",
        "SKU": "HORBASITUB000000050",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.5,
        "MV": [
            {
                "IdVariety": 151,
                "Name": "Basil 2.5oz 9 Pk Organic",
                "Qty": 9.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 16 OZ",
        "SKU": "HCRBASIBOX000000038",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 153,
                "Name": "Basil 3 LB Box Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BOX 16 OZ",
        "SKU": "HORBASIBOX000000073",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 154,
                "Name": "Basil 3 LB Box Organic",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BAG 4 OZ",
        "SKU": "HORBASIBAG000000077",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 157,
                "Name": "Basil 4 oz   4 PK Organic",
                "Qty": 4.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 4 OZ",
        "SKU": "HCRBASIBOX000000078",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 158,
                "Name": "Basil 4 oz Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 4 OZ",
        "SKU": "HCRBASIBAG000000053",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 159,
                "Name": "Basil 4 oz Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 4 OZ",
        "SKU": "HCRBASIBOX000000078",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 162,
                "Name": "BASIL 4OZ 4PK 4OZ BOX Conventional",
                "Qty": 4.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL WRAPPED 4 OZ",
        "SKU": "HCRBASIWRA000000081",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 164,
                "Name": "Basil 4Oz Bag and Box Wrapped Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL TUB 4 OZ",
        "SKU": "HCRBASITUB000000082",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 166,
                "Name": "Basil 4oz Tub 3pk Conventional Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 8 OZ",
        "SKU": "HCRBASIBOX000000083",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 8.0,
        "MV": [
            {
                "IdVariety": 170,
                "Name": "Basil 8 oz Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 8 OZ",
        "SKU": "HCRBASIBAG000000085",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 8.0,
        "MV": [
            {
                "IdVariety": 172,
                "Name": "Basil 8 oz Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 1 OZ",
        "SKU": "HCRBASICLA000000058",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 176,
                "Name": "BASIL CLAMS 1 oz Clamshell Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 0.25 OZ",
        "SKU": "HCRBASICLA000000061",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.25,
        "MV": [
            {
                "IdVariety": 178,
                "Name": "Basil Clamshell 1/4oz 3pk Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 0.25 OZ",
        "SKU": "HORBASICLA000000062",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.25,
        "MV": [
            {
                "IdVariety": 179,
                "Name": "Basil Clamshell 1/4oz 3pk Organic",
                "Qty": 3.0
            },
            {
                "IdVariety": 180,
                "Name": "Basil Clamshell 1/4oz 6pk Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 1 OZ",
        "SKU": "HCRBASICLA000000058",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 181,
                "Name": "Basil Clamshell 1oz 12 Pk Conventional",
                "Qty": 12.0
            },
            {
                "IdVariety": 182,
                "Name": "Basil Clamshell 1oz 3 pk Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 1 OZ",
        "SKU": "HORBASICLA000000086",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 183,
                "Name": "Basil Clamshell 1oz 3 pk Organic",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL CLAM 1 OZ",
        "SKU": "HCRBASICLA000000058",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 184,
                "Name": "Basil Clamshell 1oz 6 Pk Conventional",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL CLAM 0.75 OZ",
        "SKU": "HORBASICLA000000052",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.75,
        "MV": [
            {
                "IdVariety": 185,
                "Name": "Basil Clamshell 3/4oz 12pk Organic",
                "Qty": 12.0
            },
            {
                "IdVariety": 187,
                "Name": "Basil Clamshell 3/4oz 3Pk Organic",
                "Qty": 3.0
            },
            {
                "IdVariety": 189,
                "Name": "Basil Clamshell 3/4oz 6pk Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 35.2 OZ",
        "SKU": "HCRBASIBOX000000070",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 35.2,
        "MV": [
            {
                "IdVariety": 196,
                "Name": "Basil KG Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 16 OZ",
        "SKU": "HCRBASIBAG000000041",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 200,
                "Name": "BASIL LEAVES 1 lb Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 35.2 OZ",
        "SKU": "HCRBASIBOX000000070",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 35.2,
        "MV": [
            {
                "IdVariety": 217,
                "Name": "Basil Master/Kilo Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 16 OZ",
        "SKU": "HCRBASIBAG000000041",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 219,
                "Name": "Basil Master/LB Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL BAG 16 OZ",
        "SKU": "HORBASIBAG000000067",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 222,
                "Name": "Basil Master/LB Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BAG 16 OZ",
        "SKU": "HCRBASIBAG000000041",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 227,
                "Name": "BASIL PESTO 1 lb Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL BOX 16 OZ",
        "SKU": "HCRBASIBOX000000038",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 229,
                "Name": "BASIL PESTO-2 LB Conventional",
                "Qty": 2.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular THAI BASIL CLAM 0.5 OZ",
        "SKU": "HORTHAICLA000000093",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 236,
                "Name": "BASIL THAI - CLAMSHELL 0.5 OZ 3 PK Organic",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL TUB 2 OZ",
        "SKU": "HCRBASITUB000000097",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.0,
        "MV": [
            {
                "IdVariety": 240,
                "Name": "Basil Tub 2.0oz 6Pc Conventional",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BASIL TUB 2 OZ",
        "SKU": "HORBASITUB000000068",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.0,
        "MV": [
            {
                "IdVariety": 241,
                "Name": "Basil Tub 2.0oz 6Pc Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL TUB 2.5 OZ",
        "SKU": "HCRBASITUB000000046",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 2.5,
        "MV": [
            {
                "IdVariety": 244,
                "Name": "Basil Tub 2.5 oz 12 Pk Conventional",
                "Qty": 12.0
            },
            {
                "IdVariety": 246,
                "Name": "Basil Tub 2.5 oz 3 Pk Conventional",
                "Qty": 3.0
            },
            {
                "IdVariety": 248,
                "Name": "Basil Tub 2.5 oz 6 Pk Conventional",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BASIL TUB 4 OZ",
        "SKU": "HCRBASITUB000000082",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 250,
                "Name": "Basil Tub 4 oz Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF CLAM 0.5 OZ",
        "SKU": "HCRBAYLCLA000000098",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 253,
                "Name": "BAY LEAF - CLAMSHELL 0.5 OZ 3 PK Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BAY LEAF CLAM 0.5 OZ",
        "SKU": "HORBAYLCLA000000099",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.5,
        "MV": [
            {
                "IdVariety": 254,
                "Name": "BAY LEAF - CLAMSHELL 0.5 OZ 3 PK Organic",
                "Qty": 3.0
            },
            {
                "IdVariety": 255,
                "Name": "BAY LEAF - CLAMSHELL 0.5 OZ 6 PK Organic",
                "Qty": 6.0
            },
            {
                "IdVariety": 257,
                "Name": "BAY LEAF - CLAMSHELL 0.5 OZ Organic",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF BOX 16 OZ",
        "SKU": "HCRBAYLBOX000000105",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 266,
                "Name": "Bay leaf 1 lb Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF BAG 16 OZ",
        "SKU": "HCRBAYLBAG000000107",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 268,
                "Name": "Bay leaf 1 lb Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF BOX 4 OZ",
        "SKU": "HCRBAYLBOX000000108",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 270,
                "Name": "Bay leaf 4 oz Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF BAG 4 OZ",
        "SKU": "HCRBAYLBAG000000109",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 4.0,
        "MV": [
            {
                "IdVariety": 271,
                "Name": "Bay leaf 4 oz Bag Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF BOX 8 OZ",
        "SKU": "HCRBAYLBOX000000110",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 8.0,
        "MV": [
            {
                "IdVariety": 274,
                "Name": "Bay leaf 8 oz Bag and Box Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BAY LEAF CLAM 0.25 OZ",
        "SKU": "HORBAYLCLA000000101",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.25,
        "MV": [
            {
                "IdVariety": 277,
                "Name": "Bay leaf Clamshell 1/4oz 3pk Organic",
                "Qty": 3.0
            },
            {
                "IdVariety": 279,
                "Name": "Bay leaf Clamshell 1/4oz 6pk Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF CLAM 1 OZ",
        "SKU": "HCRBAYLCLA000000102",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 281,
                "Name": "Bay leaf Clamshell 1oz 3 pk Conventional",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BAY LEAF CLAM 1 OZ",
        "SKU": "HORBAYLCLA000000112",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 282,
                "Name": "Bay leaf Clamshell 1oz 3 pk Organic",
                "Qty": 3.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF CLAM 1 OZ",
        "SKU": "HCRBAYLCLA000000102",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 1.0,
        "MV": [
            {
                "IdVariety": 283,
                "Name": "Bay leaf Clamshell 1oz 6 Pk Conventional",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BAY LEAF CLAM 0.75 OZ",
        "SKU": "HORBAYLCLA000000114",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 0.75,
        "MV": [
            {
                "IdVariety": 285,
                "Name": "Bay leaf Clamshell 3/4oz 3Pk Organic",
                "Qty": 3.0
            },
            {
                "IdVariety": 287,
                "Name": "Bay leaf Clamshell 3/4oz 6pk Organic",
                "Qty": 6.0
            }
        ]
    },
    {
        "MasterProductName": "Conventional Regular BAY LEAF BAG 16 OZ",
        "SKU": "HCRBAYLBAG000000107",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 291,
                "Name": "Bay leaf Master/LB Conventional",
                "Qty": 1.0
            }
        ]
    },
    {
        "MasterProductName": "Organic Regular BAY LEAF BAG 16 OZ",
        "SKU": "HORBAYLBAG000000103",
        "MeasurementUnit": "OZ",
        "MeasurementUnitValue": 16.0,
        "MV": [
            {
                "IdVariety": 294,
                "Name": "Bay leaf Master/LB Organic",
                "Qty": 1.0
            }
        ]
    }
],

  employees: [
    { id: 'e1',  name: 'Carlos Mendez',  role: 'Harvester' },
    { id: 'e2',  name: 'Juan Torres',    role: 'Harvester' },
    { id: 'e3',  name: 'Pedro Guzman',   role: 'Harvester' },
    { id: 'e4',  name: 'Luis Herrera',   role: 'Harvester' },
    { id: 'e5',  name: 'Maria Lopez',    role: 'Harvester' },
    { id: 'e6',  name: 'Ana Rios',       role: 'Senior' },
    { id: 'e7',  name: 'Sofia Vargas',   role: 'Harvester' },
    { id: 'e8',  name: 'Elena Castro',   role: 'Senior' },
    { id: 'e9',  name: 'Miguel Reyes',   role: 'Harvester' },
    { id: 'e10', name: 'Laura Morales',  role: 'Harvester' },
    { id: 'e11', name: 'Diego Flores',   role: 'Harvester' },
    { id: 'e12', name: 'Rosa Jimenez',   role: 'Senior' },
    { id: 'e13', name: 'Fernando Ruiz',  role: 'Harvester' },
    { id: 'e14', name: 'Carmen Silva',   role: 'Harvester' },
    { id: 'e15', name: 'Roberto Diaz',   role: 'Harvester' },
  ],

  growers: [
    { id: 'g1', name: 'Green Valley Farm',   location: 'Salinas, CA',     rating: 4.8, specialties: ['Leafy Greens'] },
    { id: 'g2', name: 'Sunrise Organics',    location: 'Watsonville, CA', rating: 4.6, specialties: ['Organic Herbs'] },
    { id: 'g3', name: 'Blue Ridge Produce',  location: 'Castroville, CA', rating: 4.5, specialties: ['Mixed Herbs'] },
    { id: 'g4', name: 'Pacific Fresh Farms', location: 'Oxnard, CA',      rating: 4.3, specialties: ['Conventional'] },
    { id: 'g5', name: 'Sierra Harvest',      location: 'Fresno, CA',      rating: 4.7, specialties: ['Organic', 'Specialty'] },
    { id: 'g6', name: 'Valley Gold Farms',   location: 'Gilroy, CA',      rating: 4.4, specialties: ['Leafy Greens', 'Herbs'] },
  ],
}