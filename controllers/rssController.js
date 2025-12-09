const RSS = require('rss');
const Article = require('../models/Article'); 

exports.getRSSFeed = async (req, res) => {
  try {
    // 1. RSS Feed Setup
    const feed = new RSS({
      title: 'India Jagran - Latest News',
      description: 'Latest News, Breaking News, Hindi News from India Jagran',
      feed_url: 'https://indiajagran.com/api/feed.xml',
      site_url: 'https://indiajagran.com',
      language: 'hi', 
      pubDate: new Date(),
      copyright: `© ${new Date().getFullYear()} India Jagran`,
      ttl: 60, 
      
      // ✅ FIX: Ye line zaroori hai images (media tags) ke liye
      custom_namespaces: {
        'media': 'http://search.yahoo.com/mrss/'
      },
    });

    // 2. Database se latest 20 Published articles layein
    const articles = await Article.find({ status: 'published' }) 
      .sort({ createdAt: -1 }) 
      .limit(20);

    // 3. Har article ko Feed mein add karein
    articles.forEach(article => {
      const title = article.longHeadline || article.title || 'Breaking News';
      const description = article.summary || article.content?.substring(0, 200) || '';
      const articleUrl = `https://indiajagran.com/article/${article.slug}`;

      // Item configuration
      const itemOptions = {
        title: title,
        description: description,
        url: articleUrl,
        guid: article._id.toString(), 
        date: article.createdAt, 
        author: 'India Jagran Team'
      };

      // 4. Image Handling
      if (article.featuredImage) {
          itemOptions.custom_elements = [
              { 'media:content': {
                  _attr: {
                    url: article.featuredImage, 
                    medium: 'image',
                    type: 'image/jpeg' 
                  }
              }}
          ];
      }

      feed.item(itemOptions);
    });

    // 5. Response bhejein
    res.set('Content-Type', 'text/xml');
    res.send(feed.xml());

  } catch (error) {
    console.error("RSS Feed Error:", error);
    res.status(500).send("Error generating feed");
  }
};