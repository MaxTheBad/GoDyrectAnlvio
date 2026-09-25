#!/usr/bin/env ruby

require 'xcodeproj'

root = File.expand_path(__dir__)
project_path = File.join(root, 'GoDyrect.xcodeproj')
project = Xcodeproj::Project.new(project_path)

project.root_object.attributes['LastSwiftUpdateCheck'] = '2650'
project.root_object.attributes['LastUpgradeCheck'] = '2650'

target = project.new_target(:application, 'GoDyrect', :ios, '17.0')
target.product_name = 'GoDyrect'

group = project.main_group.new_group('GoDyrect', 'GoDyrect')
source_files = %w[GoDyrectApp.swift ContentView.swift GoDyrectWebView.swift]
source_refs = source_files.map { |name| group.new_file(name) }
target.add_file_references(source_refs)

assets = group.new_file('Assets.xcassets')
target.resources_build_phase.add_file_reference(assets)

target.build_configurations.each do |config|
  settings = config.build_settings
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.godyrect.mobile'
  settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  settings['INFOPLIST_FILE'] = 'GoDyrect/Info.plist'
  settings['CODE_SIGN_ENTITLEMENTS'] = 'GoDyrect/GoDyrect.entitlements'
  settings['CODE_SIGN_STYLE'] = 'Automatic'
  settings['DEVELOPMENT_TEAM'] = '3258CL32QP'
  settings['SWIFT_VERSION'] = '5.0'
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  settings['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  settings['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = 'AccentColor'
  settings['CURRENT_PROJECT_VERSION'] = '2'
  settings['MARKETING_VERSION'] = '1.0.0'
  settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'YES'
  settings['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks']
end

project.build_configurations.each do |config|
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
end

project.save
puts "Generated #{project_path}"
