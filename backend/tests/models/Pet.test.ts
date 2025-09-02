import Pet, { IPet } from '../../src/models/Pet';
import User, { IUser } from '../../src/models/User';
import mongoose from 'mongoose';

describe('Pet Model', () => {
  let testUser: IUser;

  beforeEach(async () => {
    // 创建测试用户
    const userData = {
      username: 'testowner',
      email: 'owner@example.com',
      password: 'password123'
    };
    testUser = new User(userData);
    await testUser.save();
  });

  describe('Pet Creation', () => {
    it('should create a pet with valid data', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        breed: '金毛',
        gender: 'male' as const,
        age: 24,
        weight: 25.5,
        description: '一只可爱的金毛犬',
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();

      expect(savedPet._id).toBeDefined();
      expect(savedPet.name).toBe(petData.name);
      expect(savedPet.type).toBe(petData.type);
      expect(savedPet.breed).toBe(petData.breed);
      expect(savedPet.gender).toBe(petData.gender);
      expect(savedPet.age).toBe(petData.age);
      expect(savedPet.weight).toBe(petData.weight);
      expect(savedPet.description).toBe(petData.description);
      expect(savedPet.ownerId.toString()).toBe(testUser._id.toString());
      expect(savedPet.isActive).toBe(true);
      expect(savedPet.createdAt).toBeDefined();
      expect(savedPet.updatedAt).toBeDefined();
    });

    it('should create a pet with minimal required data', async () => {
      const petData = {
        name: '小黑',
        type: 'cat' as const,
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();

      expect(savedPet.name).toBe(petData.name);
      expect(savedPet.type).toBe(petData.type);
      expect(savedPet.ownerId.toString()).toBe(testUser._id.toString());
      expect(savedPet.isActive).toBe(true);
    });

    it('should create a pet with medical history', async () => {
      const petData = {
        name: '小花',
        type: 'dog' as const,
        ownerId: testUser._id,
        medicalHistory: {
          allergies: ['花粉', '海鲜'],
          medications: ['抗过敏药'],
          conditions: ['皮肤过敏']
        }
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();

      expect(savedPet.medicalHistory?.allergies).toEqual(['花粉', '海鲜']);
      expect(savedPet.medicalHistory?.medications).toEqual(['抗过敏药']);
      expect(savedPet.medicalHistory?.conditions).toEqual(['皮肤过敏']);
    });
  });

  describe('Pet Validation', () => {
    it('should require name', async () => {
      const petData = {
        type: 'dog' as const,
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('宠物名称是必填项');
    });

    it('should require type', async () => {
      const petData = {
        name: '小白',
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('宠物类型是必填项');
    });

    it('should require ownerId', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('宠物必须有主人');
    });

    it('should validate pet type', async () => {
      const petData = {
        name: '小白',
        type: 'bird' as any, // 无效类型
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('宠物类型必须是dog、cat或other');
    });

    it('should validate gender', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        gender: 'unknown' as any, // 无效性别
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('性别必须是male或female');
    });

    it('should validate name length', async () => {
      const petData = {
        name: 'a'.repeat(21), // 超过20字符
        type: 'dog' as const,
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('宠物名称不能超过20个字符');
    });

    it('should validate breed length', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        breed: 'a'.repeat(51), // 超过50字符
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('品种名称不能超过50个字符');
    });

    it('should validate description length', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        description: 'a'.repeat(501), // 超过500字符
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('描述不能超过500个字符');
    });

    it('should validate age range', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        age: -1, // 负数年龄
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('年龄不能为负数');
    });

    it('should validate maximum age', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        age: 361, // 超过最大年龄
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('年龄不能超过360个月');
    });

    it('should validate weight range', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        weight: -1, // 负数体重
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('体重不能为负数');
    });

    it('should validate maximum weight', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        weight: 201, // 超过最大体重
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      
      await expect(pet.save()).rejects.toThrow('体重不能超过200kg');
    });
  });

  describe('Pet Virtual Fields', () => {
    it('should include virtual id field in JSON', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();
      const petJSON = savedPet.toJSON();

      expect(petJSON.id).toBeDefined();
      expect(petJSON._id).toBeUndefined();
      expect(petJSON.__v).toBeUndefined();
    });
  });

  describe('Pet Types', () => {
    it('should accept all valid pet types', async () => {
      const types = ['dog', 'cat', 'other'] as const;
      
      for (const type of types) {
        const petData = {
          name: `宠物_${type}`,
          type: type,
          ownerId: testUser._id
        };

        const pet = new Pet(petData);
        const savedPet = await pet.save();
        expect(savedPet.type).toBe(type);
      }
    });
  });

  describe('Pet Genders', () => {
    it('should accept valid genders', async () => {
      const genders = ['male', 'female'] as const;
      
      for (const gender of genders) {
        const petData = {
          name: `宠物_${gender}`,
          type: 'dog' as const,
          gender: gender,
          ownerId: testUser._id
        };

        const pet = new Pet(petData);
        const savedPet = await pet.save();
        expect(savedPet.gender).toBe(gender);
      }
    });
  });

  describe('Pet Medical History', () => {
    it('should handle empty medical history arrays', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        ownerId: testUser._id,
        medicalHistory: {
          allergies: [],
          medications: [],
          conditions: []
        }
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();

      expect(savedPet.medicalHistory?.allergies).toEqual([]);
      expect(savedPet.medicalHistory?.medications).toEqual([]);
      expect(savedPet.medicalHistory?.conditions).toEqual([]);
    });

    it('should trim medical history strings', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        ownerId: testUser._id,
        medicalHistory: {
          allergies: [' 花粉 ', ' 海鲜 '],
          medications: [' 抗过敏药 '],
          conditions: [' 皮肤过敏 ']
        }
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();

      expect(savedPet.medicalHistory?.allergies).toEqual(['花粉', '海鲜']);
      expect(savedPet.medicalHistory?.medications).toEqual(['抗过敏药']);
      expect(savedPet.medicalHistory?.conditions).toEqual(['皮肤过敏']);
    });
  });

  describe('Pet Owner Relationship', () => {
    it('should reference the correct owner', async () => {
      const petData = {
        name: '小白',
        type: 'dog' as const,
        ownerId: testUser._id
      };

      const pet = new Pet(petData);
      const savedPet = await pet.save();

      // 使用populate验证关系
      const populatedPet = await Pet.findById(savedPet._id).populate('ownerId');
      expect(populatedPet?.ownerId).toBeDefined();
      expect((populatedPet?.ownerId as any).username).toBe(testUser.username);
    });
  });
});