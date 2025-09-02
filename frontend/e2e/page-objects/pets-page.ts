import { Page, expect } from '@playwright/test';
import { BasePage } from '../utils/base-page';

/**
 * 宠物管理页面对象类
 * 处理宠物的增删改查操作
 */
export class PetsPage extends BasePage {
  // 页面选择器
  private readonly selectors = {
    // 宠物列表
    petsList: '[data-testid="pets-list"]',
    petCard: '[data-testid="pet-card"]',
    petName: '[data-testid="pet-name"]',
    petType: '[data-testid="pet-type"]',
    petBreed: '[data-testid="pet-breed"]',
    petAge: '[data-testid="pet-age"]',
    petWeight: '[data-testid="pet-weight"]',
    petAvatar: '[data-testid="pet-avatar"]',
    
    // 操作按钮
    addPetButton: '[data-testid="add-pet-button"]',
    editPetButton: '[data-testid="edit-pet-button"]',
    deletePetButton: '[data-testid="delete-pet-button"]',
    savePetButton: '[data-testid="save-pet-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    
    // 宠物表单
    petForm: '[data-testid="pet-form"]',
    petNameInput: '[data-testid="pet-name-input"]',
    petTypeSelect: '[data-testid="pet-type-select"]',
    petBreedInput: '[data-testid="pet-breed-input"]',
    petAgeInput: '[data-testid="pet-age-input"]',
    petWeightInput: '[data-testid="pet-weight-input"]',
    petGenderSelect: '[data-testid="pet-gender-select"]',
    petBirthdateInput: '[data-testid="pet-birthdate-input"]',
    petDescriptionInput: '[data-testid="pet-description-input"]',
    petAvatarUpload: '[data-testid="pet-avatar-upload"]',
    
    // 搜索和筛选
    searchInput: '[data-testid="pets-search"]',
    searchButton: '[data-testid="search-button"]',
    clearSearchButton: '[data-testid="clear-search-button"]',
    typeFilter: '[data-testid="type-filter"]',
    breedFilter: '[data-testid="breed-filter"]',
    ageFilter: '[data-testid="age-filter"]',
    sortSelect: '[data-testid="sort-select"]',
    
    // 分页
    pagination: '[data-testid="pagination"]',
    prevPageButton: '[data-testid="prev-page"]',
    nextPageButton: '[data-testid="next-page"]',
    pageNumber: '[data-testid="page-number"]',
    
    // 状态指示器
    loadingSpinner: '[data-testid="pets-loading"]',
    emptyState: '[data-testid="empty-pets"]',
    errorMessage: '[data-testid="pets-error"]',
    successMessage: '[data-testid="pets-success"]',
    
    // 确认对话框
    confirmDialog: '[data-testid="confirm-dialog"]',
    confirmDeleteButton: '[data-testid="confirm-delete"]',
    cancelDeleteButton: '[data-testid="cancel-delete"]',
    
    // 详情视图
    petDetails: '[data-testid="pet-details"]',
    petDetailsName: '[data-testid="pet-details-name"]',
    petDetailsInfo: '[data-testid="pet-details-info"]',
    closeDetailsButton: '[data-testid="close-details"]'
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 导航到宠物管理页面
   */
  async goToPetsPage(): Promise<void> {
    await this.goto('/pets');
    await this.waitForElement(this.selectors.petsList);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 添加新宠物
   */
  async addPet(petData: {
    name: string;
    type: 'dog' | 'cat';
    breed: string;
    age: number;
    weight: number;
    gender?: 'male' | 'female';
    birthdate?: string;
    description?: string;
    avatarPath?: string;
  }): Promise<void> {
    await this.goToPetsPage();
    
    // 点击添加宠物按钮
    await this.safeClick(this.selectors.addPetButton);
    await this.waitForElement(this.selectors.petForm);
    
    // 填写宠物信息
    await this.fillPetForm(petData);
    
    // 保存宠物
    await this.safeClick(this.selectors.savePetButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    // 验证添加成功
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 编辑宠物信息
   */
  async editPet(petName: string, updatedData: Partial<{
    name: string;
    type: 'dog' | 'cat';
    breed: string;
    age: number;
    weight: number;
    gender: 'male' | 'female';
    birthdate: string;
    description: string;
  }>): Promise<void> {
    await this.goToPetsPage();
    
    // 找到并点击编辑按钮
    const petCard = await this.findPetCard(petName);
    await petCard.locator(this.selectors.editPetButton).click();
    await this.waitForElement(this.selectors.petForm);
    
    // 更新宠物信息
    await this.fillPetForm(updatedData);
    
    // 保存更改
    await this.safeClick(this.selectors.savePetButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    // 验证更新成功
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 删除宠物
   */
  async deletePet(petName: string): Promise<void> {
    await this.goToPetsPage();
    
    // 找到并点击删除按钮
    const petCard = await this.findPetCard(petName);
    await petCard.locator(this.selectors.deletePetButton).click();
    
    // 确认删除
    await this.waitForElement(this.selectors.confirmDialog);
    await this.safeClick(this.selectors.confirmDeleteButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    // 验证删除成功
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 获取宠物列表
   */
  async getPetList(): Promise<Array<{
    name: string;
    type: string;
    breed: string;
    age: string;
    weight: string;
  }>> {
    await this.goToPetsPage();
    
    const petCards = this.page.locator(this.selectors.petCard);
    const count = await petCards.count();
    const pets = [];
    
    for (let i = 0; i < count; i++) {
      const card = petCards.nth(i);
      const pet = {
        name: await card.locator(this.selectors.petName).textContent() || '',
        type: await card.locator(this.selectors.petType).textContent() || '',
        breed: await card.locator(this.selectors.petBreed).textContent() || '',
        age: await card.locator(this.selectors.petAge).textContent() || '',
        weight: await card.locator(this.selectors.petWeight).textContent() || ''
      };
      pets.push(pet);
    }
    
    return pets;
  }

  /**
   * 搜索宠物
   */
  async searchPets(keyword: string): Promise<Array<{
    name: string;
    type: string;
    breed: string;
  }>> {
    await this.goToPetsPage();
    
    // 输入搜索关键词
    await this.safeFill(this.selectors.searchInput, keyword);
    await this.safeClick(this.selectors.searchButton);
    
    // 等待搜索结果
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    return await this.getPetList();
  }

  /**
   * 清除搜索
   */
  async clearSearch(): Promise<void> {
    await this.safeClick(this.selectors.clearSearchButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 按类型筛选宠物
   */
  async filterByType(type: 'dog' | 'cat' | 'all'): Promise<void> {
    await this.page.locator(this.selectors.typeFilter).selectOption(type);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 按品种筛选宠物
   */
  async filterByBreed(breed: string): Promise<void> {
    await this.page.locator(this.selectors.breedFilter).selectOption(breed);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 排序宠物列表
   */
  async sortPets(sortBy: 'name' | 'age' | 'weight' | 'created'): Promise<void> {
    await this.page.locator(this.selectors.sortSelect).selectOption(sortBy);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 查看宠物详情
   */
  async viewPetDetails(petName: string): Promise<{
    name: string;
    info: string;
  }> {
    const petCard = await this.findPetCard(petName);
    await petCard.click();
    
    await this.waitForElement(this.selectors.petDetails);
    
    const name = await this.getElementText(this.selectors.petDetailsName);
    const info = await this.getElementText(this.selectors.petDetailsInfo);
    
    return { name, info };
  }

  /**
   * 关闭宠物详情
   */
  async closePetDetails(): Promise<void> {
    await this.safeClick(this.selectors.closeDetailsButton);
    await expect(this.page.locator(this.selectors.petDetails)).not.toBeVisible();
  }

  /**
   * 验证宠物表单
   */
  async validatePetForm(): Promise<{
    requiredFields: string[];
    errors: string[];
  }> {
    // 尝试提交空表单
    await this.safeClick(this.selectors.savePetButton);
    await this.page.waitForTimeout(1000);
    
    const errors = await this.getFormErrors();
    
    return {
      requiredFields: errors.filter(error => 
        error.includes('必填') || error.includes('required')
      ),
      errors
    };
  }

  /**
   * 上传宠物头像
   */
  async uploadPetAvatar(imagePath: string): Promise<void> {
    const fileInput = this.page.locator(this.selectors.petAvatarUpload);
    await fileInput.setInputFiles(imagePath);
    
    // 等待上传完成
    await this.waitForLoadingComplete();
  }

  /**
   * 检查是否有宠物
   */
  async hasPets(): Promise<boolean> {
    await this.goToPetsPage();
    
    try {
      await this.waitForElement(this.selectors.petCard, 5000);
      return true;
    } catch {
      // 检查是否显示空状态
      return !(await this.isElementVisible(this.selectors.emptyState));
    }
  }

  /**
   * 获取宠物数量
   */
  async getPetCount(): Promise<number> {
    await this.goToPetsPage();
    return await this.page.locator(this.selectors.petCard).count();
  }

  /**
   * 分页导航
   */
  async goToNextPage(): Promise<void> {
    await this.safeClick(this.selectors.nextPageButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  async goToPrevPage(): Promise<void> {
    await this.safeClick(this.selectors.prevPageButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  async goToPage(pageNumber: number): Promise<void> {
    const pageButton = this.page.locator(this.selectors.pageNumber, { hasText: pageNumber.toString() });
    await pageButton.click();
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 获取当前页码
   */
  async getCurrentPage(): Promise<number> {
    const activePageElement = this.page.locator(`${this.selectors.pageNumber}.active`);
    const pageText = await activePageElement.textContent();
    return parseInt(pageText || '1');
  }

  /**
   * 验证宠物信息显示
   */
  async verifyPetInfo(petName: string, expectedInfo: Partial<{
    type: string;
    breed: string;
    age: string;
    weight: string;
  }>): Promise<void> {
    const petCard = await this.findPetCard(petName);
    
    if (expectedInfo.type) {
      const type = await petCard.locator(this.selectors.petType).textContent();
      expect(type).toContain(expectedInfo.type);
    }
    
    if (expectedInfo.breed) {
      const breed = await petCard.locator(this.selectors.petBreed).textContent();
      expect(breed).toContain(expectedInfo.breed);
    }
    
    if (expectedInfo.age) {
      const age = await petCard.locator(this.selectors.petAge).textContent();
      expect(age).toContain(expectedInfo.age);
    }
    
    if (expectedInfo.weight) {
      const weight = await petCard.locator(this.selectors.petWeight).textContent();
      expect(weight).toContain(expectedInfo.weight);
    }
  }

  /**
   * 私有方法：填写宠物表单
   */
  private async fillPetForm(petData: Partial<{
    name: string;
    type: 'dog' | 'cat';
    breed: string;
    age: number;
    weight: number;
    gender: 'male' | 'female';
    birthdate: string;
    description: string;
    avatarPath: string;
  }>): Promise<void> {
    if (petData.name) {
      await this.safeFill(this.selectors.petNameInput, petData.name);
    }
    
    if (petData.type) {
      await this.page.locator(this.selectors.petTypeSelect).selectOption(petData.type);
    }
    
    if (petData.breed) {
      await this.safeFill(this.selectors.petBreedInput, petData.breed);
    }
    
    if (petData.age) {
      await this.safeFill(this.selectors.petAgeInput, petData.age.toString());
    }
    
    if (petData.weight) {
      await this.safeFill(this.selectors.petWeightInput, petData.weight.toString());
    }
    
    if (petData.gender) {
      await this.page.locator(this.selectors.petGenderSelect).selectOption(petData.gender);
    }
    
    if (petData.birthdate) {
      await this.safeFill(this.selectors.petBirthdateInput, petData.birthdate);
    }
    
    if (petData.description) {
      await this.safeFill(this.selectors.petDescriptionInput, petData.description);
    }
    
    if (petData.avatarPath) {
      await this.uploadPetAvatar(petData.avatarPath);
    }
  }

  /**
   * 分享宠物给其他用户
   */
  async sharePetWithUser(petName: string, userEmail: string, permission: 'read' | 'edit' = 'read'): Promise<void> {
    const petCard = await this.findPetCard(petName);
    
    // 点击分享按钮
    await petCard.locator('[data-testid="share-pet-button"]').click();
    await this.waitForElement('[data-testid="share-pet-dialog"]');
    
    // 输入用户邮箱
    await this.safeFill('[data-testid="share-user-email"]', userEmail);
    
    // 选择权限级别
    await this.page.locator('[data-testid="share-permission-select"]').selectOption(permission);
    
    // 确认分享
    await this.safeClick('[data-testid="confirm-share-button"]');
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 撤销宠物分享权限
   */
  async revokePetSharing(petName: string, userEmail: string): Promise<void> {
    const petCard = await this.findPetCard(petName);
    
    // 点击管理分享按钮
    await petCard.locator('[data-testid="manage-sharing-button"]').click();
    await this.waitForElement('[data-testid="sharing-management-dialog"]');
    
    // 找到对应用户并撤销
    const userRow = this.page.locator(`[data-testid="shared-user-row"][data-email="${userEmail}"]`);
    await userRow.locator('[data-testid="revoke-sharing-button"]').click();
    
    // 确认撤销
    await this.safeClick('[data-testid="confirm-revoke-button"]');
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 获取共享宠物列表
   */
  async getSharedPetList(): Promise<Array<{
    name: string;
    type: string;
    breed: string;
    isShared: boolean;
    permission: string;
  }>> {
    await this.goToPetsPage();
    
    // 切换到共享宠物标签
    await this.safeClick('[data-testid="shared-pets-tab"]');
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    const sharedPetCards = this.page.locator('[data-testid="shared-pet-card"]');
    const count = await sharedPetCards.count();
    const pets = [];
    
    for (let i = 0; i < count; i++) {
      const card = sharedPetCards.nth(i);
      const pet = {
        name: await card.locator('[data-testid="shared-pet-name"]').textContent() || '',
        type: await card.locator('[data-testid="shared-pet-type"]').textContent() || '',
        breed: await card.locator('[data-testid="shared-pet-breed"]').textContent() || '',
        isShared: true,
        permission: await card.locator('[data-testid="shared-pet-permission"]').textContent() || ''
      };
      pets.push(pet);
    }
    
    return pets;
  }

  /**
   * 查看共享宠物详情
   */
  async viewSharedPetDetails(petName: string): Promise<{
    name: string;
    info: string;
  }> {
    // 切换到共享宠物标签
    await this.safeClick('[data-testid="shared-pets-tab"]');
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    const sharedPetCard = this.page.locator(`[data-testid="shared-pet-card"]:has-text("${petName}")`);
    await sharedPetCard.click();
    
    await this.waitForElement('[data-testid="shared-pet-details"]');
    
    const name = await this.getElementText('[data-testid="shared-pet-details-name"]');
    const info = await this.getElementText('[data-testid="shared-pet-details-info"]');
    
    return { name, info };
  }

  /**
   * 检查是否可以编辑共享宠物
   */
  async canEditSharedPet(petName: string): Promise<boolean> {
    await this.safeClick('[data-testid="shared-pets-tab"]');
    const sharedPetCard = this.page.locator(`[data-testid="shared-pet-card"]:has-text("${petName}")`);
    
    try {
      await sharedPetCard.locator('[data-testid="edit-shared-pet-button"]').waitFor({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否可以删除共享宠物
   */
  async canDeleteSharedPet(petName: string): Promise<boolean> {
    await this.safeClick('[data-testid="shared-pets-tab"]');
    const sharedPetCard = this.page.locator(`[data-testid="shared-pet-card"]:has-text("${petName}")`);
    
    try {
      await sharedPetCard.locator('[data-testid="delete-shared-pet-button"]').waitFor({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取宠物头像URL
   */
  async getPetAvatarUrl(petName: string): Promise<string> {
    const petCard = await this.findPetCard(petName);
    const avatarElement = petCard.locator(this.selectors.petAvatar);
    return await avatarElement.getAttribute('src') || '';
  }

  /**
   * 检查是否可以导出宠物数据
   */
  async canExportPetData(): Promise<boolean> {
    await this.goToPetsPage();
    
    try {
      await this.waitForElement('[data-testid="export-data-button"]', 3000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 导出宠物数据
   */
  async exportPetData(): Promise<{
    pets: any[];
    records: any[];
  }> {
    await this.safeClick('[data-testid="export-data-button"]');
    await this.waitForElement('[data-testid="export-dialog"]');
    
    // 选择导出格式
    await this.page.locator('[data-testid="export-format-select"]').selectOption('json');
    
    // 确认导出
    await this.safeClick('[data-testid="confirm-export-button"]');
    
    // 等待导出完成并获取数据
    await this.waitForElement('[data-testid="export-result"]');
    
    const exportDataText = await this.getElementText('[data-testid="export-result"]');
    return JSON.parse(exportDataText);
  }

  /**
   * 删除用户账户
   */
  async deleteUserAccount(): Promise<void> {
    // 导航到用户设置
    await this.goto('/profile/settings');
    await this.waitForElement('[data-testid="account-settings"]');
    
    // 点击删除账户按钮
    await this.safeClick('[data-testid="delete-account-button"]');
    await this.waitForElement('[data-testid="delete-account-dialog"]');
    
    // 输入确认文本
    await this.safeFill('[data-testid="delete-confirmation-input"]', 'DELETE');
    
    // 确认删除
    await this.safeClick('[data-testid="confirm-delete-account-button"]');
    await this.waitForLoadingComplete();
  }

  /**
   * 获取成功消息
   */
  async getSuccessMessage(): Promise<string> {
    try {
      return await this.waitForSuccessMessage(this.selectors.successMessage, 5000);
    } catch {
      return '';
    }
  }

  /**
   * 私有方法：查找宠物卡片
   */
  private async findPetCard(petName: string) {
    const petCards = this.page.locator(this.selectors.petCard);
    const count = await petCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = petCards.nth(i);
      const name = await card.locator(this.selectors.petName).textContent();
      if (name?.includes(petName)) {
        return card;
      }
    }
    
    throw new Error(`找不到名为 "${petName}" 的宠物`);
  }
}