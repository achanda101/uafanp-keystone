// schema.ts
import 'dotenv/config'

import { list, group } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import {
  text,
  relationship,
  password,
  timestamp,
  select,
  virtual
} from '@keystone-6/core/fields';
import { cloudinaryImage } from '@keystone-6/cloudinary'
import { graphql } from '@keystone-6/core';
import { document } from '@keystone-6/fields-document'
import { type Lists } from '.keystone/types'

// Validate environment variables before creating config
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(`Missing Cloudinary environment variables:
    CLOUDINARY_CLOUD_NAME: ${cloudName ? 'SET' : 'MISSING'}
    CLOUDINARY_API_KEY: ${apiKey ? 'SET' : 'MISSING'}
    CLOUDINARY_API_SECRET: ${apiSecret ? 'SET' : 'MISSING'}
  `)
}

// Helper function to create slug from title
function createSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100); // Limit length
}

// Helper function to validate unique slug
async function validateUniqueSlug(
  slug: string,
  listKey: string,
  itemId: string | undefined,
  context: any,
  addValidationError: (msg: string) => void
) {
  if (!slug) return;

  try {
    const existingItems = await context.query[ listKey ].findMany({
      where: { slug: { equals: slug } },
      query: 'id slug'
    });

    // Filter out the current item if we're updating
    const duplicates = existingItems.filter((item: any) => item.id !== itemId);

    if (duplicates.length > 0) {
      const listName = listKey === 'Post' ? 'post' : 'page';
      addValidationError(`This slug is already used by another ${listName}. Please choose a different slug or modify the title to generate a unique slug.`);
    }
  } catch (error) {
    console.error(`Error validating slug uniqueness for ${listKey}:`, error);
    addValidationError('Unable to validate slug uniqueness. Please try again.');
  }
}

// Create Cloudinary configuration object
const generalImageConfig = {
  cloudName,
  apiKey,
  apiSecret,
  folder: 'images',
  uploadOptions: {
    resource_type: 'image',
    allowed_formats: [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg' ],
    max_file_size: 10000000, // 10MB for general images
    quality: 'auto',
  },
  // Transformation options for optimization
  transformation: {
    fetch_format: 'auto',
    quality: 'auto',
    // Optional: Add max dimensions
    width: 2000,
    height: 2000,
    crop: 'limit', // Don't upscale, only downscale if larger
  },
}

const bannerCloudinaryConfig = {
  cloudName,
  apiKey,
  apiSecret,
  folder: 'banners',
  uploadOptions: {
    resource_type: 'image',
    allowed_formats: [ 'jpg', 'jpeg', 'png', 'webp', 'tiff' ], // More restrictive for banners
    max_file_size: 5000000, // 5MB for banners
    quality: 'auto',
  },
  transformation: {
    fetch_format: 'auto',
    quality: 'auto',
    // Optional: Add max dimensions
    width: 2000,
    height: 2000,
    crop: 'limit', // Don't upscale, only downscale if larger
  },
}

export const lists = {
  HomePage: list({
    isSingleton: true,
    access: allowAll,
    fields: {
      title: text({
        validation: { isRequired: true },
        ui: {
          description: 'Title of Page',
        },
      }),
      ...group({
        label: "Hero Section",
        description: "Details for Hero Section",
        fields: ({
          heroHeading: text({
            ui: {
              description: 'Heading for Hero section',
            },
          }),

          heroSubheading: text({
            ui: {
              displayMode: 'textarea',
              description: 'Subheading for Hero section',
            },
          }),

          ctaButtonText: text({
            label: 'CTA Button Text',
            validation: { isRequired: true },
            ui: {
              description: 'Text displayed on the call-to-action button',
            },
          }),

          ctaButtonUrl: text({
            label: 'CTA Button URL',
            validation: {
              isRequired: true,
              length: { max: 2000 },
            },
            hooks: {
              resolveInput: async ({ resolvedData }) => {
                let url = resolvedData.ctaButtonUrl;
                if (url && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                  url = `https://${url}`;
                }
                return url;
              },
              validateInput: async ({ resolvedData, addValidationError }) => {
                const url = resolvedData.ctaButtonUrl;
                if (url) {
                  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                    return;
                  }

                  try {
                    new URL(url);
                  } catch {
                    addValidationError('Please enter a valid URL');
                  }
                }
              },
            },
            ui: {
              description: 'URL for the button. Supports: https://example.com, /internal-page, mailto:user@example.com, tel:+1234567890, #section',
            },
          }),
        }),
      }),
      grantCardsQuickView: virtual({
        field: graphql.field({
          type: graphql.String,
          async resolve(item, args, context) {
            const grantTypes = await context.query.GrantType.findMany({
              query: 'title isDisplayed grantAmount availability'
            });

            if (!grantTypes || grantTypes.length === 0) {
              return 'No grants created yet.';
            }

            const lines = [
              ...grantTypes.map(grant => {
                const status = grant.isDisplayed === 'visible' ? 'VISIBLE' : 'HIDDEN';
                return `${status} ${grant.title} - ${grant.grantAmount} (${grant.availability})`;
              })
            ];
            return lines.join(' || ');

          }
        }),
        ui: {
          createView: { fieldMode: 'hidden' },
          itemView: {
            fieldMode: 'read',
            displayMode: 'textarea'
          },
          listView: { fieldMode: 'hidden' },
        }
      }),
      toPublish: select({
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
        defaultValue: 'draft',
        ui: {
          description: 'Set to Published to display this page on the website',
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  GrantType: list({
    access: allowAll,
    fields: {
      title: text({ validation: { isRequired: true } }),
      slug: text({
        isIndexed: 'unique',
        hooks: {
          resolveInput: async ({ resolvedData, inputData }) => {
            // Auto-generate slug from title if not provided or if title changed
            if (resolvedData.title && (!inputData.slug || inputData.slug.trim() === '')) {
              return createSlugFromTitle(resolvedData.title);
            }
            // If slug is provided, clean it up
            if (resolvedData.slug) {
              return resolvedData.slug.trim();
            }
            return resolvedData.slug;
          },
          validateInput: async ({ resolvedData, item, addValidationError, context }) => {
            // Check if we have a slug after auto-generation
            if (!resolvedData.slug || resolvedData.slug.trim() === '') {
              addValidationError('Slug is required. Please provide a title to auto-generate a slug or enter a custom slug.');
              return;
            }

            await validateUniqueSlug(
              resolvedData.slug,
              'GrantType',
              item?.id,
              context,
              addValidationError
            );
          },
        },
        ui: {
          description: "Leave empty to auto-generate from title, or enter a custom URL-friendly slug."
        }
      }),
      ...group({
        label: "Grant Card Details",
        fields: {
          description: text({
            validation: { isRequired: true },
            ui: {
              displayMode: 'textarea',
              description: "Brief summary for the grant card which will appear on the Homepage and the Grants landing page."
            }
          }),
          grantAmount: text({ validation: { isRequired: true } }),
          timeFrame: text({
            validation: { isRequired: true },
            ui: {
              description: "Usage Timeframe."
            }
          }),
          availability: text({ validation: { isRequired: true } }),
          commonUses: text({
            validation: { isRequired: true },
            ui: {
              displayMode: 'textarea',
              description: "List the common uses for this grant. They will be displayed on the Grant Card."
            }
          }),
          badgeText: text({ validation: { isRequired: true } }),
          badgeColor: select({
            options: [
              { label: 'Turmeric', value: 'grant-turmeric' },
              { label: 'Urgent Red', value: 'grant-urgent' },
            ],
            defaultValue: 'grant-turmeric',
          }),
          backgroundColor: select({
            options: [
              { label: 'Light Sky Blue', value: 'light-sky' },
              { label: 'Light Forest Green', value: 'light-forest' },
              { label: 'Light Turmeric', value: 'turmeric-light' },
            ],
            defaultValue: 'light-sky',
          }),
        }
      }),
      grantPurpose: text({
        validation: { isRequired: true },
        ui: {
          displayMode: 'textarea',
          description: "Detailed description of this grant's purpose and goals. This content appears on the dedicated grant page and helps defenders determine if they should apply."
        }
      }),
      isDisplayed: select({
        options: [
          { label: 'Visible', value: 'visible' },
          { label: 'Hidden', value: 'hidden' },
        ],
        defaultValue: 'visible',
        ui: {
          description: "If visible, the Grant Card will appear on the Homepage and a dedicated grant page will be published."
        }
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'isDisplayed', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  Page: list({
    access: allowAll,
    fields: {
      title: text({
        validation: { isRequired: true },
        ui: {
          description: 'Title of Page',
        },
      }),
      slug: text({
        isIndexed: 'unique',
        hooks: {
          resolveInput: async ({ resolvedData, inputData }) => {
            // Auto-generate slug from title if not provided or if title changed
            if (resolvedData.title && (!inputData.slug || inputData.slug.trim() === '')) {
              return createSlugFromTitle(resolvedData.title);
            }
            // If slug is provided, clean it up
            if (resolvedData.slug) {
              return resolvedData.slug.trim();
            }
            return resolvedData.slug;
          },
          validateInput: async ({ resolvedData, item, addValidationError, context }) => {
            // Check if we have a slug after auto-generation
            if (!resolvedData.slug || resolvedData.slug.trim() === '') {
              addValidationError('Slug is required. Please provide a title to auto-generate a slug or enter a custom slug.');
              return;
            }

            await validateUniqueSlug(
              resolvedData.slug,
              'Page',
              item?.id,
              context,
              addValidationError
            );
          },
        },
        ui: {
          description: 'Leave empty to auto-generate from title, or enter a custom URL-friendly slug.',
        },
      }),
      ...group({
        label: "Hero Section",
        description: "Details for Hero Section",
        fields: ({
          heroHeading: text({
            ui: {
              description: 'Heading for Hero section',
            },
          }),

          heroSubheading: text({
            ui: {
              displayMode: 'textarea',
              description: 'Subheading for Hero section',
            },
          }),

          ctaButtonText: text({
            label: 'CTA Button Text',
            validation: { isRequired: true },
            ui: {
              description: 'Text displayed on the call-to-action button',
            },
          }),

          ctaButtonUrl: text({
            label: 'CTA Button URL',
            validation: {
              isRequired: true,
              length: { max: 2000 },
            },
            hooks: {
              resolveInput: async ({ resolvedData }) => {
                let url = resolvedData.ctaButtonUrl;
                if (url && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                  url = `https://${url}`;
                }
                return url;
              },
              validateInput: async ({ resolvedData, addValidationError }) => {
                const url = resolvedData.ctaButtonUrl;
                if (url) {
                  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                    return;
                  }

                  try {
                    new URL(url);
                  } catch {
                    addValidationError('Please enter a valid URL');
                  }
                }
              },
            },
            ui: {
              description: 'URL for the button. Supports: https://example.com, /internal-page, mailto:user@example.com, tel:+1234567890, #section',
            },
          }),
        }),
      }),
      toPublish: select({
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
        defaultValue: 'draft',
        ui: {
          description: 'Set to Published to display this page on the website',
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  Post: list({
    access: allowAll,
    fields: {
      title: text({
        validation: { isRequired: true },
        ui: {
          description: 'Title of Post',
        },
      }),

      slug: text({
        isIndexed: 'unique',
        hooks: {
          resolveInput: async ({ resolvedData, inputData }) => {
            // Auto-generate slug from title if not provided or if title changed
            if (resolvedData.title && (!inputData.slug || inputData.slug.trim() === '')) {
              return createSlugFromTitle(resolvedData.title);
            }
            // If slug is provided, clean it up
            if (resolvedData.slug) {
              return resolvedData.slug.trim();
            }
            return resolvedData.slug;
          },
          validateInput: async ({ resolvedData, item, addValidationError, context }) => {
            // Check if we have a slug after auto-generation
            if (!resolvedData.slug || resolvedData.slug.trim() === '') {
              addValidationError('Slug is required. Please provide a title to auto-generate a slug or enter a custom slug.');
              return;
            }

            await validateUniqueSlug(
              resolvedData.slug,
              'Post',
              item?.id,
              context,
              addValidationError
            );
          },
        },
        ui: {
          description: 'Leave empty to auto-generate from title, or enter a custom URL-friendly slug.',
        },
      }),

      banner: cloudinaryImage({
        cloudinary: bannerCloudinaryConfig,
        ui: {
          description: 'Upload a banner image for this post',
        },
      }),

      content: document({
        formatting: true,
        layouts: [
          [ 1, 1 ],
          [ 1, 1, 1 ],
          [ 2, 1 ],
          [ 1, 2 ],
          [ 1, 2, 1 ],
        ],
        links: true,
        dividers: true,
      }),

      author: relationship({
        ref: 'User.posts',
        ui: {
          displayMode: 'cards',
          cardFields: [ 'name', 'email' ],
          inlineEdit: { fields: [ 'name', 'email' ] },
          linkToItem: true,
          inlineConnect: true,
        },
        many: false,
      }),

      tags: relationship({
        ref: 'Tag.posts',
        many: true,
        ui: {
          displayMode: 'cards',
          cardFields: [ 'name' ],
          inlineEdit: { fields: [ 'name' ] },
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: [ 'name' ] },
        },
      }),

      toPublish: select({
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
        defaultValue: 'draft',
        ui: {
          description: 'Set to Published to display this page on the website',
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  User: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
      }),
      password: password({ validation: { isRequired: true } }),
      posts: relationship({ ref: 'Post.author', many: true }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
    },
  }),

  Tag: list({
    access: allowAll,
    ui: {
      isHidden: true,
    },
    fields: {
      name: text(),
      posts: relationship({ ref: 'Post.tags', many: true }),
    },
  }),
} satisfies Lists