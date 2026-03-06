import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CmsPage, CmsPageDocument } from './schemas/cms-page.schema';
import { UpdateCmsDto } from './dto/update-cms.dto';

const DEFAULT_PAGES = [
  {
    key: 'terms_of_service',
    title: 'Terms of Service',
    content: '',
    url: '',
  },
  {
    key: 'privacy_policy',
    title: 'Privacy Policy',
    content: '',
    url: '',
  },
  {
    key: 'help_support',
    title: 'Help & Support',
    content: 'For any questions or assistance, please reach out to our support team.',
    contactPhone: '',
    contactEmail: '',
  },
];

@Injectable()
export class CmsService {
  constructor(@InjectModel(CmsPage.name) private cmsModel: Model<CmsPageDocument>) {
    this.seedDefaults();
  }

  private async seedDefaults() {
    for (const page of DEFAULT_PAGES) {
      const existing = await this.cmsModel.findOne({ key: page.key });
      if (!existing) {
        await this.cmsModel.create(page);
      }
    }
  }

  async findAll() {
    return this.cmsModel.find().sort({ key: 1 }).lean();
  }

  async findByKey(key: string) {
    const page = await this.cmsModel.findOne({ key }).lean();
    if (!page) {
      return { key, title: key, content: '', contactPhone: '', contactEmail: '', url: '' };
    }
    return page;
  }

  async updateByKey(key: string, updateDto: UpdateCmsDto) {
    const page = await this.cmsModel.findOneAndUpdate(
      { key },
      { $set: updateDto },
      { new: true, upsert: true },
    );
    return page;
  }
}
