NEWSBLUR.Views.Folder = Backbone.View.extend({

    className: 'folder',
    
    tagName: 'li',
    
    options: {
        depth: 0,
        collapsed: false,
        title: '',
        root: false
    },
    
    events: {
        "click .NB-feedlist-manage-icon"            : "show_manage_menu",
        "click .folder_title"                       : "open",
        "click .NB-feedlist-collapse-icon"          : "collapse_folder",
        "click .NB-feedbar-mark-feed-read"          : "mark_folder_as_read",
        "click .NB-feedbar-mark-feed-read-expand"   : "expand_mark_read",
        "click .NB-feedbar-options"                 : "open_options_popover",
        "click .NB-story-title-indicator"           : "show_hidden_story_titles",
        "mouseenter"                                : "add_hover_inverse",
        "mouseleave"                                : "remove_hover_inverse"
    },
    
    initialize: function() {
        _.bindAll(this, 'update_title', 'update_selected', 'delete_folder', 'check_collapsed',
                  'update_hidden');

        this.options.folder_title = this.model && this.model.get('folder_title');

        if (this.model && !this.options.feed_chooser) {
            // Root folder does not have a model.
            this.model.bind('change:folder_title', this.update_title);
            this.model.bind('change:selected', this.update_selected);
            this.model.bind('change:selected', this.update_hidden);
            this.collection.bind('change:feed_selected', this.update_hidden);
            this.collection.bind('change:counts', this.update_hidden);
            this.model.bind('delete', this.delete_folder);
            if (!this.options.feedbar) {
                this.model.folder_view = this;
            }
        }
    },
    
    destroy: function() {
        console.log(["destroy", this]);
        if (this.model) {
            this.model.unbind(null, this);
        }
        this.$el.remove();
        delete this.views;
    },
    
    render: function() {
        var depth = this.options.depth;
        var folder_title = this.options.folder_title;
        var feed_chooser = this.options.feed_chooser;
        var folder_collection = this.collection;
        this.options.collapsed =  folder_title && _.contains(NEWSBLUR.Preferences.collapsed_folders, folder_title);
        var $folder = this.render_folder();
        
        if (!this.options.only_title) {
            var $feeds = _.compact(this.collection.map(function(item) {
                if (item.is_feed()) {
                    if (!feed_chooser && !item.feed.get('active')) return;
                    var feed_title_view = new NEWSBLUR.Views.FeedTitleView({
                        model: item.feed, 
                        type: 'feed',
                        depth: depth,
                        folder_title: folder_title,
                        folder: folder_collection,
                        feed_chooser: feed_chooser
                    }).render();
                    item.feed.views.push(feed_title_view);
                    item.feed.folders.push(folder_collection);
                    return feed_title_view.el;
                } else if (item.is_folder()) {
                    var folder_view = new NEWSBLUR.Views.Folder({
                        model: item,
                        collection: item.folders,
                        depth: depth + 1,
                        feed_chooser: feed_chooser
                    }).render();
                    item.folder_views.push(folder_view);
                    return folder_view.el;
                } else {
                    // console.log(["Not a feed or folder", item]);
                }
            }));
            $feeds.push(this.make('li', { 'class': 'feed NB-empty' }));
            this.$('.folder').append($feeds);
        }
        
        this.check_collapsed({skip_animation: true});
        this.update_hidden();
        this.$('.folder_title').eq(0).bind('contextmenu', _.bind(this.show_manage_menu_rightclick, this));
        
        return this;
    },
    
    render_folder: function($feeds) {
        var $folder = _.template('<<%= list_type %> class="folder NB-folder">\
        <% if (!root) { %>\
            <div class="folder_title <% if (depth <= 1) { %>NB-toplevel<% } %>">\
                <% if (feedbar) { %>\
                    <div class="NB-feedbar-mark-feed-read-container">\
                        <div class="NB-feedbar-mark-feed-read"><div class="NB-icon"></div></div>\
                        <div class="NB-feedbar-mark-feed-read-time NB-1d">1d</div>\
                        <div class="NB-feedbar-mark-feed-read-time NB-3d">3d</div>\
                        <div class="NB-feedbar-mark-feed-read-time NB-7d">7d</div>\
                        <div class="NB-feedbar-mark-feed-read-time NB-14d">14d</div>\
                        <div class="NB-feedbar-mark-feed-read-expand"></div>\
                    </div>\
                    <div class="NB-story-title-indicator">\
                        <div class="NB-story-title-indicator-count"></div>\
                        <span class="NB-story-title-indicator-text">show hidden stories</span>\
                    </div>\
                <% } %>\
                <div class="NB-folder-icon"></div>\
                <div class="NB-feedlist-collapse-icon" title="<% if (is_collapsed) { %>Expand Folder<% } else {%>Collapse Folder<% } %>"></div>\
                <div class="NB-feedlist-manage-icon"></div>\
                <span class="folder_title_text">\
                    <span><%= folder_title %></span>\
                </span>\
                <% if (feedbar) { %>\
                    <div class="NB-feedbar-options-container">\
                        <span class="NB-feedbar-options">\
                            <div class="NB-icon"></div>\
                            <%= NEWSBLUR.assets.view_setting("river:"+folder_title, "read_filter") %>\
                            &middot;\
                            <%= NEWSBLUR.assets.view_setting("river:"+folder_title, "order") %>\
                        </span>\
                    </div>\
                    <div class="NB-search-container"></div>\
              <% } %>\
            </div>\
        <% } %>\
        <% if (!feedbar) { %>\
            <ul class="folder <% if (root) { %>NB-root<% } %>" <% if (is_collapsed) { %>style="display: none"<% } %>>\
            </ul>\
        <% } %>\
        </<%= list_type %>>\
        ', {
          depth         : this.options.depth,
          folder_title  : this.options.folder_title,
          is_collapsed  : this.options.collapsed && !this.options.feed_chooser,
          root          : this.options.root,
          feedbar       : this.options.feedbar,
          list_type     : this.options.feedbar ? 'div' : 'li'
        });

        this.$el.replaceWith($folder);
        this.setElement($folder);
        
        if (this.options.feedbar) {
            this.show_collapsed_folder_count();
        }
        if (this.options.feedbar && NEWSBLUR.Globals.is_staff) {
            this.search_view = new NEWSBLUR.Views.FeedSearchView({
                feedbar_view: this
            }).render();
            this.$(".NB-search-container").html(this.search_view.$el);
        }
        return $folder;
    },
    
    update_title: function() {
        this.$('.folder_title_text span').eq(0).html(this.model.get('folder_title'));
    },
    
    update_selected: function() {
        this.$el.toggleClass('NB-selected', this.model.get('selected'));
    },
    
    update_hidden: function() {
        if (!this.model) return;
        
        var has_unreads = this.model.has_unreads({include_selected: true});
        if (!has_unreads && NEWSBLUR.assets.preference('hide_read_feeds')) {
            this.$el.addClass('NB-hidden');
        } else {
            this.$el.removeClass('NB-hidden');
        }
    },
    
    // ===========
    // = Actions =
    // ===========
    
    check_collapsed: function(options) {
        options = options || {};
        var self = this;
        if (!this.options.folder_title || !this.options.folder_title.length) return;
        
        var show_folder_counts = NEWSBLUR.assets.preference('folder_counts');
        var collapsed = _.contains(NEWSBLUR.Preferences.collapsed_folders, this.options.folder_title);
        if (collapsed || show_folder_counts) {
            this.show_collapsed_folder_count(options);
        }
    },
    
    show_collapsed_folder_count: function(options) {
        options = options || {};
        var $folder_title = this.$('.folder_title').eq(0);
        var $counts = $('.feed_counts_floater', $folder_title);
        var $river = $('.NB-feedlist-collapse-icon', $folder_title);
        
        this.$el.addClass('NB-folder-collapsed');
        $counts.remove();

        if ($folder_title.hasClass('NB-hover')) {
            $river.animate({'opacity': 0}, {'duration': options.skip_animation ? 0 : 100});
            $folder_title.addClass('NB-feedlist-folder-title-recently-collapsed');
            $folder_title.one('mouseover', function() {
                $river.css({'opacity': ''});
                $folder_title.removeClass('NB-feedlist-folder-title-recently-collapsed');
            });
        }
        
        this.folder_count = new NEWSBLUR.Views.UnreadCount({
            collection: this.collection
        }).render();
        var $counts = this.folder_count.$el;
        if (this.options.feedbar) {
            this.$('.NB-story-title-indicator-count').html($counts.clone());
        } else {
            $folder_title.prepend($counts.css({
                'opacity': 0
            }));
        }
        $counts.animate({'opacity': 1}, {'duration': options.skip_animation ? 0 : 400});
    },
    
    hide_collapsed_folder_count: function() {
        var $folder_title = this.$('.folder_title').eq(0);
        var $counts = $('.feed_counts_floater', $folder_title);
        var $river = $('.NB-feedlist-collapse-icon', $folder_title);
        
        $counts.animate({'opacity': 0}, {
            'duration': 300 
        });
        
        $river.animate({'opacity': .6}, {'duration': 400});
        $folder_title.removeClass('NB-feedlist-folder-title-recently-collapsed');
        $folder_title.one('mouseover', function() {
            $river.css({'opacity': ''});
            $folder_title.removeClass('NB-feedlist-folder-title-recently-collapsed');
        });
    },
    
    // ==========
    // = Events =
    // ==========
   
    open: function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.options.feed_chooser) return;
        var $folder = $(e.currentTarget).closest('li.folder');
        if ($folder[0] != this.el) return;
        if ($(e.currentTarget)[0] != this.$('.folder_title')[0]) return;
        if (e.which >= 2) return;
        if (e.which == 1 && $('.NB-menu-manage-container:visible').length) return;

        NEWSBLUR.reader.open_river_stories(this.$el, this.model);
    },
    
    show_manage_menu_rightclick: function(e) {
        if (!NEWSBLUR.assets.preference('show_contextmenus')) return;
        
        return this.show_manage_menu(e);
    },
    
    show_manage_menu: function(e) {
        if (this.options.feed_chooser) return;
        e.preventDefault();
        e.stopPropagation();

        NEWSBLUR.reader.show_manage_menu('folder', this.$el, {
            toplevel: this.options.depth == 0,
            folder_title: this.options.folder_title,
            rightclick: e.which >= 2
        });

        return false;
    },
    
    add_hover_inverse: function() {
        if (NEWSBLUR.app.feed_list.is_sorting()) {
            return;
        }

        if (this.$el.offset().top > $(window).height() - 246) {
            this.$el.addClass('NB-hover-inverse');
        } 
    },
    
    remove_hover_inverse: function() {
        this.$el.removeClass('NB-hover-inverse');
    },
    
    delete_folder: function() {
        this.$el.slideUp(500);
        
        var feed_ids_in_folder = this.model.feed_ids_in_folder();
        if (_.contains(feed_ids_in_folder, NEWSBLUR.reader.active_feed)) {
            NEWSBLUR.reader.reset_feed();
            NEWSBLUR.reader.show_splash_page();
        }
    },
    
    collapse_folder: function(e, options) {
        e.preventDefault();
        e.stopPropagation();
        options = options || {};
        var self = this;
        var $children = this.$el.children('ul.folder');
        var $folder = $(e.currentTarget).closest('li.folder');
        if ($folder[0] != this.el) return;
        
        // Hiding / Collapsing
        if (options.force_collapse || 
            ($children.length && 
             $children.eq(0).is(':visible') && 
             !this.collection.collapsed)) {
            NEWSBLUR.log(["hiding folder", $children, this.collection, this.options.folder_title]);
            NEWSBLUR.assets.collapsed_folders(this.options.folder_title, true);
            this.collection.collapsed = true;
            this.$el.addClass('NB-folder-collapsed');
            $children.animate({'opacity': 0}, {
                'queue': false,
                'duration': options.force_collapse ? 0 : 200,
                'complete': function() {
                    self.show_collapsed_folder_count();
                    $children.slideUp({
                        'duration': 270,
                        'easing': 'easeOutQuart'
                    });
                }
            });
        } 
        // Showing / Expanding
        else if ($children.length && 
                   (this.collection.collapsed || !$children.eq(0).is(':visible'))) {
            NEWSBLUR.log(["showing folder", this.collection, this.options.folder_title]);
            NEWSBLUR.assets.collapsed_folders(this.options.folder_title, false);
            this.collection.collapsed = false;
            this.$el.removeClass('NB-folder-collapsed');
            if (!NEWSBLUR.assets.preference('folder_counts')) {
                this.hide_collapsed_folder_count();
            }
            $children.css({'opacity': 0}).slideDown({
                'duration': 240,
                'easing': 'easeInOutCubic',
                'complete': function() {
                    $children.animate({'opacity': 1}, {'queue': false, 'duration': 200});
                }
            });
        }
    },
    
    mark_folder_as_read: function() {
        NEWSBLUR.reader.mark_folder_as_read();
        this.$('.NB-feedbar-mark-feed-read').fadeOut(400);
    },
    
    expand_mark_read: function() {
        NEWSBLUR.Views.FeedTitleView.prototype.expand_mark_read.call(this);
    },
    
    open_options_popover: function() {
        NEWSBLUR.FeedOptionsPopover.create({
            anchor: this.$(".NB-feedbar-options"),
            feed_id: "river:" + this.options.folder_title
        });
    },
    
    show_hidden_story_titles: function() {
        NEWSBLUR.app.story_titles_header.show_hidden_story_titles();
    }
    
});